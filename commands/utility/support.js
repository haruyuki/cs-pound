import { SlashCommandBuilder } from "discord.js"

export const data = new SlashCommandBuilder()
    .setName("support")
    .setDescription("Sends you a link to the CS-Pound Dev Server.")

export async function execute(interaction) {
    await interaction.reply({
        content:
            "Need help with the bot? Come join the support server here! https://support.haruyuki.moe/",
        ephemeral: true,
    })
}
