import { EmbedBuilder, SlashCommandBuilder, version } from "discord.js"
import { MongoClient } from "mongodb"
import ms from "ms"

import { BOT_VERSION, DATABASE_CONFIG } from "../../config.js"
import { requestCache } from "../../utils/api/webrequests.js"

export const data = new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Get some statistics about the bot.")

export async function execute(interaction) {
    await interaction.deferReply()
    const guildCount = interaction.client.guilds.cache.size
    const commandCount = interaction.client.commands.size
    const nodeVersion = process.version
    const uptime = ms(process.uptime() * 1000, { long: true })

    // Cache statistics
    const generalCacheSize = await requestCache.general.size()
    const shortCacheSize = await requestCache.short.size()
    const staticCacheSize = await requestCache.static.size()
    const totalCacheEntries =
        generalCacheSize + shortCacheSize + staticCacheSize

    // Autoremind user statistics
    let totalAutoremindUsers = 0
    let poundUsers = 0
    let lafUsers = 0

    try {
        // Connect to MongoDB
        const client = new MongoClient(DATABASE_CONFIG.MONGODB.URI)
        await client.connect()
        const database = client.db(DATABASE_CONFIG.MONGODB.DB_NAME)
        const collection = database.collection(
            DATABASE_CONFIG.MONGODB.COLLECTIONS.AUTO_REMIND,
        )

        // Count total users
        totalAutoremindUsers = await collection.countDocuments()

        // Count users with pound reminders (pound > 0)
        poundUsers = await collection.countDocuments({ pound: { $gt: 0 } })

        // Count users with lost and found reminders (laf > 0)
        lafUsers = await collection.countDocuments({ laf: { $gt: 0 } })

        // Close the connection
        await client.close()
    } catch (error) {
        console.error(`Error fetching autoremind stats: ${error.message}`)
    }

    const statsEmbed = new EmbedBuilder()
        .setColor(0x00ae86)
        .setTitle("CS-Pound Stats")
        .setDescription("`Created by blumewmew. CS: haruyuki`")
        .addFields(
            // Bot information
            { name: "Guild Count", value: `${guildCount}`, inline: true },
            { name: "Command Count", value: `${commandCount}`, inline: true },
            { name: "Node Version", value: `${nodeVersion}`, inline: true },
            {
                name: "discord.js Version",
                value: `${version}`,
                inline: true,
            },
            { name: "Bot Version", value: `v${BOT_VERSION}`, inline: true },
            { name: "Uptime", value: `${uptime}`, inline: true },

            { name: "\u200B", value: "**Cache Statistics**", inline: false },
            {
                name: "Total Cache Entries",
                value: `${totalCacheEntries}`,
                inline: true,
            },
            {
                name: "General Cache",
                value: `${generalCacheSize} entries`,
                inline: true,
            },
            {
                name: "Static Cache",
                value: `${staticCacheSize} entries`,
                inline: true,
            },

            {
                name: "\u200B",
                value: "**Autoremind Statistics**",
                inline: false,
            },
            {
                name: "Total Autoremind Users",
                value: `${totalAutoremindUsers}`,
                inline: true,
            },
            { name: "Pound Users", value: `${poundUsers}`, inline: true },
            {
                name: "Lost and Found Users",
                value: `${lafUsers}`,
                inline: true,
            },
        )

    await interaction.editReply({ embeds: [statsEmbed] })
}
