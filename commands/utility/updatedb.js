import {
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js"

import { makeGETRequest } from "../../utils/api/webrequests.js"
import { Logger } from "../../utils/common/logger.js"
import { ItemDB, PetDB } from "../../utils/database/chickensmoothie-db.js"

const EXCEPTIONS = new Set([
    "3B46301A6C8B850D87A730DA365B0960",
    "E5FEFE44A3070BC9FC176503EC1A603F",
    "0C1AFF9AEAA0953F1B1F9B818C2771C9",
    "7C912BA5616D2E24E9F700D90E4BA2B6",
    "905BB7DE4BC4E29D7FD2D1969667B568",
    "773B14EEB416FA762C443D909FFED344",
    "1C0DB4785FC78DF4395263D40261C614",
    "5066110701B0AE95948A158F0B262EBB",
    "5651A6C10C4D375A1901142C49C5C70C",
    "8BED72498D055E55ABCA7AD29B180BF4",
])

async function fetchEventLinks(year, type) {
    const url = `https://www.chickensmoothie.com/archive/${year}/${type === "pets" ? "" : "Items/"}`
    // Use static cache type with longer TTL since archive pages rarely change
    const $ = await makeGETRequest(url, { use: true, type: "static" })
    return $("li.event.active a, li.event a")
        .map((_, el) => $(el).attr("href"))
        .get()
}

async function processPage(pageLink, type, year, eventTitle) {
    // Use static cache type since these pages don't change frequently
    const $ = await makeGETRequest(pageLink, { use: true, type: "static" })
    let added = 0

    if (type === "pets") {
        const petLinks = $('img[alt="Pet"]')
            .map((_, el) => $(el).attr("src"))
            .get()

        const petIds = [
            ...new Set(
                petLinks.map((link) => {
                    const params = new URLSearchParams(link.split("?")[1])
                    return params.get("k")
                }),
            ),
        ].filter((id) => id && !EXCEPTIONS.has(id))

        await Promise.all(
            petIds.map(async (petId) => {
                try {
                    await PetDB.upsert({
                        petID: petId,
                        petYear: year,
                        petEvent: eventTitle,
                        petLink: pageLink,
                    })
                    added++
                } catch (err) {
                    if (err.name === "SequelizeUniqueConstraintError") {
                        Logger.warn(`Pet ID ${petId} already exists.`)
                    } else {
                        Logger.error(err)
                    }
                }
            }),
        )
        return added
    }

    if (type === "items") {
        const items = $("li.item")
            .map((_, item) => {
                const imageLink = $(item).find("img").attr("src")
                const components = new URL(imageLink)
                const path = components.pathname.slice(6).split("&")
                const name = $(item).find("div").text().trim() || null
                const left = parseInt(path[0])
                const right = parseInt(path[1].match(/\d+/)[0])
                return { name, left, right }
            })
            .get()

        await Promise.all(
            items.map(async ({ name, left, right }) => {
                try {
                    await ItemDB.upsert({
                        itemLID: left,
                        itemRID: right,
                        itemName: name,
                        itemYear: year,
                        itemEvent: eventTitle,
                        itemLink: pageLink,
                    })
                    added.added++
                } catch (err) {
                    if (err.name === "SequelizeUniqueConstraintError") {
                        Logger.warn(`Item ID ${left}-${right} already exists.`)
                    } else {
                        Logger.error(err)
                    }
                }
            }),
        )
        return added
    }
    return added
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export const data = new SlashCommandBuilder()
    .setName("updatedb")
    .setDescription("Update the database with pet data for a specific year")
    .addNumberOption((option) =>
        option
            .setName("year")
            .setDescription("The year to update")
            .setRequired(true),
    )
    .addStringOption((option) =>
        option
            .setName("type")
            .setDescription("Update pet or item database")
            .setRequired(true)
            .addChoices(
                { name: "Pets", value: "pets" },
                { name: "Items", value: "items" },
            ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export async function execute(interaction) {
    const year = interaction.options.getNumber("year")
    const type = interaction.options.getString("type")

    try {
        // Initial reply with loading message
        await interaction.reply(
            `Fetching events for ${type} database of year ${year}...`,
        )

        // Get all event links
        const eventLinks = await fetchEventLinks(year, type)

        if (eventLinks.length === 0) {
            await interaction.editReply(
                `No events found for ${type} of year ${year}.`,
            )
            return
        }

        // Create an array to track event processing status
        const eventStatuses = []

        // Process event links to get titles and create status tracking
        for (const event of eventLinks) {
            const link = decodeURIComponent(event.replace(/\?.*$/, ""))
            const baseLink = `https://www.chickensmoothie.com${encodeURI(link)}`
            const eventTitle =
                type === "pets" ? link.slice(14, -1) : link.slice(14, -7)

            eventStatuses.push({
                title: eventTitle,
                link: baseLink,
                completed: false,
                pages: 0,
            })
        }

        // Create initial progress embed
        const progressEmbed = new EmbedBuilder()
            .setColor(0x00ae86)
            .setTitle(`Updating ${type} database for year ${year}`)
            .setDescription(`Processing ${eventLinks.length} events...`)
            .setTimestamp()

        // Add fields for each event
        eventStatuses.forEach((event, index) => {
            progressEmbed.addFields({
                name: `${index + 1}. ${event.title}`,
                value: "⏳ Pending",
                inline: false,
            })
        })

        // Send the initial embed
        await interaction.editReply({ embeds: [progressEmbed] })

        // Process each event
        for (let i = 0; i < eventLinks.length; i++) {
            const event = eventLinks[i]
            const link = decodeURIComponent(event.replace(/\?.*$/, ""))
            const baseLink = `https://www.chickensmoothie.com${encodeURI(link)}`

            // Use static cache type since event pages rarely change
            const $ = await makeGETRequest(baseLink, {
                use: true,
                type: "static",
            })

            const eventTitle =
                type === "pets" ? link.slice(14, -1) : link.slice(14, -7)
            const pages =
                $("div.pages").length === 0 ? 1 : $("div.pages a").length

            // Update status to processing
            eventStatuses[i].pages = pages
            progressEmbed.spliceFields(i, 1, {
                name: `${i + 1}. ${eventTitle}`,
                value: "🔄 Processing...",
                inline: false,
            })

            await interaction.editReply({ embeds: [progressEmbed] })

            // Process all pages for this event
            let addedStats = 0

            for (let page = 0; page < pages; page++) {
                const pageMultiplier = type === "pets" ? 7 : 10
                const pageLink =
                    page === 0
                        ? baseLink
                        : `${baseLink}?pageStart=${page * pageMultiplier}`
                const pageStats = await processPage(
                    pageLink,
                    type,
                    year,
                    eventTitle,
                )

                // Accumulate stats for this event
                addedStats += pageStats

                await delay(5000)
            }

            // Store stats in eventStatuses
            eventStatuses[i].added = addedStats

            // Mark event as completed
            eventStatuses[i].completed = true
            progressEmbed.spliceFields(i, 1, {
                name: `${i + 1}. ${eventTitle}`,
                value: `✅ Completed - ${pages} page${pages > 1 ? "s" : ""} processed (Added ${addedStats} ${type})`,
                inline: false,
            })

            await interaction.editReply({ embeds: [progressEmbed] })
            await delay(5000)
        }

        // Calculate total stats across all events
        const totalAdded = eventStatuses.reduce(
            (sum, event) => sum + (event.added || 0),
            0,
        )

        // Update embed with completion message including stats
        progressEmbed.setDescription(
            `✅ Update complete for ${type} database of year ${year}!\nTotal: ${totalAdded} ${type} added`,
        )
        // Green color for completion
        progressEmbed.setColor(0x00ff00)
        await interaction.editReply({ embeds: [progressEmbed] })
    } catch (err) {
        Logger.error(err)
        await interaction.editReply({
            content: "An error occurred while updating the database.",
            embeds: [],
        })
    }
}
