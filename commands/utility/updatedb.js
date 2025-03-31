import {
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js"

import { fetchEventLinks, processPage } from "../../utils/api/chickensmoothie-archive.js"
import { makeGETRequest } from "../../utils/api/webrequests.js"
import { delay } from "../../utils/common/delay.js"
import { Logger } from "../../utils/common/logger.js"


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

    Logger.info(`Starting updatedb command for ${type} of year ${year}`)
    Logger.debug(
        `Command executed by user: ${interaction.user.tag} (${interaction.user.id})`,
    )

    try {
        // Initial reply with loading message
        await interaction.reply(
            `Fetching events for ${type} database of year ${year}...`,
        )
        Logger.debug("Initial reply sent to user")

        // Get all event links
        Logger.debug(`Fetching event links for ${year}`)
        const eventLinks = await fetchEventLinks(year, type)

        if (eventLinks.length === 0) {
            Logger.warn(`No events found for ${type} of year ${year}`)
            await interaction.editReply(
                `No events found for ${type} of year ${year}.`,
            )
            return
        }

        Logger.info(
            `Found ${eventLinks.length} events for ${type} of year ${year}`,
        )

        // Create an array to track event processing status
        const eventStatuses = []
        Logger.debug(
            `Creating event status tracking for ${eventLinks.length} events`,
        )

        // Process event links to get titles and create status tracking
        for (const event of eventLinks) {
            const link = decodeURIComponent(event.replace(/\?.*$/, ""))
            const baseLink = `https://www.chickensmoothie.com${encodeURI(link)}`
            const eventTitle =
                type === "pets" ? link.slice(14, -1) : link.slice(14, -7)

            Logger.debug(
                `Adding event to tracking: ${eventTitle} (${baseLink})`,
            )
            eventStatuses.push({
                title: eventTitle,
                link: baseLink,
                completed: false,
                pages: 0,
            })
        }

        // Create initial progress embed
        Logger.debug(`Creating progress embed for ${eventLinks.length} events`)
        const progressEmbed = new EmbedBuilder()
            .setColor(0x00ae86)
            .setTitle(`Updating ${type} database for year ${year}`)
            .setDescription(`Processing ${eventLinks.length} events...`)
            .setTimestamp()

        // Group events into Monthly and Special categories
        const monthlyEvents = eventStatuses
            .filter((event) =>
                /^(January|February|March|April|May|June|July|August|September|October|November|December)/.test(
                    event.title,
                ) && !/^April Fool's/.test(event.title),
            )
            .map((event) => ({ ...event, status: "⏳ Pending" }))

        const specialEvents = eventStatuses
            .filter(
                (event) =>
                    !/^(January|February|March|April|May|June|July|August|September|October|November|December)/.test(
                        event.title,
                    ) || /^April Fool's/.test(event.title),
            )
            .map((event) => ({ ...event, status: "⏳ Pending" }))

        Logger.debug(
            `Grouped events: ${monthlyEvents.length} monthly events, ${specialEvents.length} special events`,
        )

        // Add fields for Monthly and Special events
        progressEmbed.addFields({
            name: "Monthly Events",
            value:
                monthlyEvents.length > 0
                    ? monthlyEvents
                        .map(
                            (event, index) =>
                                `${index + 1}. ${event.title}: ⏳ Pending`,
                        )
                        .join("\n")
                    : "No monthly events found.",
            inline: false,
        })

        progressEmbed.addFields({
            name: "Special Events",
            value:
                specialEvents.length > 0
                    ? specialEvents
                        .map(
                            (event, index) =>
                                `${index + 1}. ${event.title}: ⏳ Pending`,
                        )
                        .join("\n")
                    : "No special events found.",
            inline: false,
        })

        // Send the initial embed
        await interaction.editReply({ embeds: [progressEmbed] })

        // Process each event
        Logger.info(`Starting to process ${eventLinks.length} events`)
        for (let i = 0; i < eventLinks.length; i++) {
            const event = eventLinks[i]
            const link = decodeURIComponent(event.replace(/\?.*$/, ""))
            const baseLink = `https://www.chickensmoothie.com${encodeURI(link)}`

            Logger.debug(
                `Processing event ${i + 1}/${eventLinks.length}: ${link}`,
            )

            // Append pageSize=3000 to get all data in one request
            const allDataLink = `${baseLink}?pageSize=3000`
            Logger.debug(
                `Making GET request to ${allDataLink} with pageSize=3000`,
            )

            // Use static cache type since event pages rarely change
            const $ = await makeGETRequest(allDataLink, {
                use: true,
                type: "static",
            })
            Logger.debug(`Received response for ${allDataLink}`)

            const eventTitle =
                type === "pets" ? link.slice(14, -1) : link.slice(14, -7)

            // Count the number of data groups instead of pagination links
            // This is an optimization: instead of making multiple requests for each page,
            // we make a single request with pageSize=3000 and process all data groups
            const groupSelector =
                type === "pets"
                    ? ".archive-pet-tree-container"
                    : ".archive-item-group"
            const dataGroups = $(groupSelector).length
            Logger.info(
                `Found ${dataGroups} data groups for event: ${eventTitle}`,
            )

            // Update status to processing
            eventStatuses[i].pages = dataGroups

            // Determine if this is a monthly or special event
            let isMonthlyEvent =
                /^(January|February|March|April|May|June|July|August|September|October|November|December)/.test(
                    eventTitle,
                ) && !/^April Fool's/.test(eventTitle)
            // 0 for Monthly, 1 for Special
            let fieldIndex = isMonthlyEvent ? 0 : 1

            // Update the event status in the appropriate field
            let events = isMonthlyEvent ? monthlyEvents : specialEvents
            let eventIndex = events.findIndex((e) => e.title === eventTitle)

            if (eventIndex !== -1) {
                events[eventIndex].status = "🔄 Processing..."

                // Update the field value with all events in this category
                const updatedValue = events
                    .map(
                        (eventField, idx) =>
                            `${idx + 1}. ${eventField.title}: ${eventField.status || "⏳ Pending"}`,
                    )
                    .join("\n")

                progressEmbed.spliceFields(fieldIndex, 1, {
                    name: isMonthlyEvent ? "Monthly Events" : "Special Events",
                    value: updatedValue,
                    inline: false,
                })

                await interaction.editReply({ embeds: [progressEmbed] })
            }

            // Process all data groups for this event
            let addedStats = 0
            Logger.debug(
                `Starting to process ${dataGroups} data groups for event: ${eventTitle}`,
            )

            for (let group = 0; group < dataGroups; group++) {
                Logger.debug(
                    `Processing group ${group + 1}/${dataGroups} for event: ${eventTitle}`,
                )
                const pageStats = await processPage(
                    $,
                    baseLink,
                    type,
                    year,
                    eventTitle,
                    group,
                )

                // Accumulate stats for this event
                addedStats += pageStats
                Logger.debug(
                    `Group ${group + 1}/${dataGroups} added ${pageStats} ${type} (running total: ${addedStats})`,
                )

                // Only delay every few groups to simulate page breaks
                if (group % 7 === 6) {
                    Logger.debug(
                        "Delaying for 2 seconds after processing 7 groups",
                    )
                    await delay(2000)
                }
            }

            // Store stats in eventStatuses
            eventStatuses[i].added = addedStats
            Logger.info(
                `Event ${i + 1}/${eventLinks.length} (${eventTitle}) completed: Added ${addedStats} ${type}`,
            )

            // Mark event as completed
            eventStatuses[i].completed = true

            // Update the event status in the appropriate field
            // Reuse the same variables from earlier in the loop to avoid redeclaration
            isMonthlyEvent =
                /^(January|February|March|April|May|June|July|August|September|October|November|December)/.test(
                    eventTitle,
                )
            // 0 for Monthly, 1 for Special
            fieldIndex = isMonthlyEvent ? 0 : 1
            events = isMonthlyEvent ? monthlyEvents : specialEvents
            eventIndex = events.findIndex((e) => e.title === eventTitle)

            if (eventIndex !== -1) {
                events[eventIndex].status =
                    `✅ Completed - ${dataGroups} ${type}${type > 1 ? "s" : ""} groups processed (Added ${addedStats} ${type})`

                // Update the field value with all events in this category
                const updatedValue = events
                    .map(
                        (eventField, idx) =>
                            `${idx + 1}. ${eventField.title}: ${eventField.status || "⏳ Pending"}`,
                    )
                    .join("\n")

                progressEmbed.spliceFields(fieldIndex, 1, {
                    name: isMonthlyEvent ? "Monthly Events" : "Special Events",
                    value: updatedValue,
                    inline: false,
                })

                Logger.debug(
                    `Updated progress embed for event ${i + 1}/${eventLinks.length}`,
                )
            }

            await interaction.editReply({ embeds: [progressEmbed] })
            Logger.debug("Delaying for 5 seconds before processing next event")
            await delay(5000)
        }

        // Calculate total stats across all events
        const totalAdded = eventStatuses.reduce(
            (sum, event) => sum + (event.added || 0),
            0,
        )
        Logger.info(
            `Command completed successfully: Added ${totalAdded} ${type} from ${eventLinks.length} events for year ${year}`,
        )

        // Update embed with completion message including stats
        progressEmbed.setDescription(
            `✅ Update complete for ${type} database of year ${year}!\nTotal: ${totalAdded} ${type} added`,
        )
        // Green color for completion
        progressEmbed.setColor(0x00ff00)
        Logger.debug("Sending final completion message to user")
        await interaction.editReply({ embeds: [progressEmbed] })
    } catch (err) {
        Logger.error(
            `Error in updatedb command for ${type} of year ${year}: ${err.message}`,
            err,
        )
        Logger.debug(`Stack trace: ${err.stack}`)
        await interaction.editReply({
            content: "An error occurred while updating the database.",
            embeds: [],
        })
        Logger.debug("Error message sent to user")
    }
}
