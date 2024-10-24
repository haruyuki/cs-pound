import { AttachmentBuilder, SlashCommandBuilder } from "discord.js"
import fetch from "node-fetch"

import { ItemDB, PetDB } from "../../lib.js"

const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]
const EXCEPTIONS = [
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
]

export const data = new SlashCommandBuilder()
    .setName("identify")
    .setDescription("Identify a pet or item to see what year/event it is from.")
    .addStringOption((option) =>
        option
            .setName("link")
            .setDescription("The link of the pet or item you want to identify.")
            .setRequired(true),
    )

export async function execute(interaction) {
    const link = interaction.options.getString("link")

    if (
        !link.includes("chickensmoothie.com") &&
        !link.includes("chickencdn.com")
    ) {
        await interaction.reply(
            "There was an error parsing the link you provided, are you sure you provided a valid link?",
        )
        return
    }

    if (link.includes("trans")) {
        await interaction.reply(
            "Pets with items are unable to be identified :frowning:",
        )
        return
    }

    if (link.includes("item")) {
        const { reply, attachment } = await identifyItem(link)
        await interaction.reply({ content: reply, files: [attachment] })
        return
    }

    if (!link.includes("k=")) {
        await interaction.reply(
            "There was an error parsing the link you provided, are you sure you provided a valid link?",
        )
        return
    }

    const { reply, attachment } = await identifyPet(link)
    await interaction.reply({ content: reply, files: [attachment] })
}

function replyWithDetails(name, event, year, link, isItem = true) {
    const isMonth = MONTHS.includes(event)
    const entityType = isItem ? "item" : "pet"

    const namePart = name ? `'${name}' ` : ""
    const eventPart = isMonth ? `${event} ${year}` : `${year} ${event}`

    return `That ${entityType} is ${namePart}from ${eventPart}!\nArchive Link: ${link}`
}

const createAttachment = async (link) => {
    const response = await fetch(link)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return new AttachmentBuilder(buffer, { name: "image.png" })
}

async function identifyItem(link) {
    const matches = link.match(/item\/(\d+)(?:&p=(\d+))?\.jpg/)
    const itemLID = matches[1]
    const itemRID = matches[2] || null
    const attachment = await createAttachment(link)

    const item = await ItemDB.findOne({
        where: itemRID == null ? { itemLID } : { itemLID, itemRID },
    })

    if (!item) {
        const reply =
            "There is no data for this item yet :frowning:\nPlease note that current year items don't have data yet."
        return {
            reply,
            attachment,
        }
    }

    const reply = replyWithDetails(
        item.get("itemName"),
        item.get("itemEvent"),
        item.get("itemYear"),
        item.get("itemLink"),
    )

    return { reply, attachment }
}

async function identifyPet(link) {
    const url = new URL(link)
    const params = new URLSearchParams(url.search)
    const petID = params.get("k")
    const attachment = await createAttachment(link)

    if (EXCEPTIONS.includes(petID)) {
        const reply =
            "That pet is not identifiable at this growth stage :frowning:"
        return {
            reply,
            attachment,
        }
    }

    const pet = await PetDB.findOne({ where: { petID: petID } })

    if (!pet) {
        const reply =
            "There is no data for this pet yet :frowning:\nPlease note that current year pets don't have data yet."
        return {
            reply,
            attachment,
        }
    }

    const reply = replyWithDetails(
        null,
        pet.get("petEvent"),
        pet.get("petYear"),
        pet.get("petLink"),
        false,
    )

    return { reply, attachment }
}
