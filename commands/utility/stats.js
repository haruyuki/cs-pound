import {
    version as discordJsVersion,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js"
import ms from "ms"
import { BOT_VERSION } from "../../lib.js"

export const data = new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Get some statistics about the bot.")

export async function execute(interaction) {
    const guildCount = interaction.client.guilds.cache.size
    const commandCount = interaction.client.commands.size
    const nodeVersion = process.version
    const uptime = ms(process.uptime() * 1000, { long: true })

    const statsEmbed = new EmbedBuilder()
        .setColor(0x00ae86)
        .setTitle("CS-Pound Stats")
        .setDescription("`Created by blumewmew. CS: haruyuki`")
        .addFields(
            { name: "Guild Count", value: `${guildCount}`, inline: true },
            { name: "Command Count", value: `${commandCount}`, inline: true },
            { name: "Node Version", value: `${nodeVersion}`, inline: true },
            {
                name: "discord.js Version",
                value: `${discordJsVersion}`,
                inline: true,
            },
            { name: "Bot Version", value: `v${BOT_VERSION}`, inline: true },
            { name: "Uptime", value: `${uptime}`, inline: true },
        )

    await interaction.reply({ embeds: [statsEmbed] })
}
