import { SlashCommandBuilder } from "discord.js"

import {
    formatTimeResponse,
    getOpeningTime,
} from "../../utils/chickensmoothie.js"

export const data = new SlashCommandBuilder()
    .setName("time")
    .setDescription("Tells you how long until the pound/lost & found opens.")

export async function execute(interaction) {
    const openingTime = await getOpeningTime()
    const response = formatTimeResponse(openingTime)
    await interaction.reply(response)
}
