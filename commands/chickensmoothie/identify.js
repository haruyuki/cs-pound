import { AttachmentBuilder, SlashCommandBuilder } from "discord.js"
import fetch from "node-fetch"

import { ItemDB, PetDB } from "../../lib.js"

const months = [
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
const exceptions = [
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

    if (link.includes("item")) {
        const matches = link.match(/item\/(\d+)(?:&p=(\d+))?\.jpg/)
        const itemLID = matches[1]
        const itemRID = matches[2] ? matches[2] : 0
        let item
        if (itemRID === 0) {
            item = await ItemDB.findOne({ where: { itemLID: itemLID } })
        } else {
            item = await ItemDB.findOne({
                where: { itemLID: itemLID, itemRID: itemRID },
            })
        }

        if (item === null) {
            await interaction.reply(
                "There is no data for this item yet :frowning:\nPlease note that current year items don't have data yet.",
            )
            return
        }

        const response = await fetch(link)
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const attachment = new AttachmentBuilder(buffer, { name: "item.png" })
        if (item.get("itemName") === null) {
            await interaction.reply({
                content: months.includes(item.get("itemEvent"))
                    ? `That item is a ${item.get("itemEvent")} ${item.get("itemYear")} item!\nArchive Link: ${item.get("itemLink")}`
                    : `That item is a ${item.get("itemYear")} ${item.get("itemEvent")} item!\nArchive Link: ${item.get("itemLink")}`,
                files: [attachment],
            })
        } else {
            await interaction.reply({
                content: months.includes(item.get("itemEvent"))
                    ? `That item is \'${item.get("itemName")}\' from ${item.get("itemEvent")} ${item.get("itemYear")}!\nArchive Link: ${item.get("itemLink")}`
                    : `That item is \'${item.get("itemName")}\' from ${item.get("itemYear")} ${item.get("itemEvent")}!\nArchive Link: ${item.get("itemLink")}`,
                files: [attachment],
            })
        }
    } else {
        if (link.includes("trans")) {
            await interaction.reply(
                "Pets with items are unable to be identified :frowning:",
            )
            return
        } else if (!link.includes("k=")) {
            await interaction.reply(
                "There was an error parsing the link you provided, are you sure you provided a valid link?",
            )
            return
        }
        const url = new URL(link)
        const params = new URLSearchParams(url.search)
        const petID = params.get("k")

        if (exceptions.includes(petID)) {
            await interaction.reply(
                "That pet is not identifiable at this growth stage :frowning:",
            )
            return
        }

        const pet = await PetDB.findOne({ where: { petID: petID } })

        if (pet === null) {
            await interaction.reply(
                "There is no data for this pet yet :frowning:\nPlease note that current year pets don't have data yet.",
            )
            return
        }

        const response = await fetch(link)
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const attachment = new AttachmentBuilder(buffer, { name: "pet.png" })
        await interaction.reply({
            content: months.includes(pet.get("petEvent"))
                ? `That pet is a ${pet.get("petEvent")} ${pet.get("petYear")} pet!\nArchive Link: ${pet.get("petLink")}`
                : `That pet is a ${pet.get("petYear")} ${pet.get("petEvent")} pet!\nArchive Link: ${pet.get("petLink")}`,
            files: [attachment],
        })
    }
}
