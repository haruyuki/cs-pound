import { SlashCommandBuilder } from "discord.js"

import {
    hasPetItems,
    hasPetParameter,
    identifyItem,
    identifyPet,
    isItemLink,
    isValidChickenSmoothieLink,
} from "../../utils/api/identification.js"

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

    if (!isValidChickenSmoothieLink(link)) {
        await interaction.reply(
            "There was an error parsing the link you provided, are you sure you provided a valid link?",
        )
        return
    }

    if (hasPetItems(link)) {
        await interaction.reply(
            "Pets with items are unable to be identified :frowning:",
        )
        return
    }

    if (isItemLink(link)) {
        const reply = await identifyItem(link)
        await interaction.reply(reply)
        return
    }

    if (!hasPetParameter(link)) {
        await interaction.reply(
            "There was an error parsing the link you provided, are you sure you provided a valid link?",
        )
        return
    }

    const reply = await identifyPet(link)
    await interaction.reply(reply)
}
