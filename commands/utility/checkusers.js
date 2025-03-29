import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { MongoClient } from "mongodb"

import { DATABASE_CONFIG } from "../../config.js"
import { Logger } from "../../utils/logger.js"

const client = new MongoClient(DATABASE_CONFIG.MONGODB.URI)
const database = client.db(DATABASE_CONFIG.MONGODB.DB_NAME)
const collection = database.collection(
    DATABASE_CONFIG.MONGODB.COLLECTIONS.AUTO_REMIND,
)

export const data = new SlashCommandBuilder()
    .setName("checkusers")
    .setDescription(
        "Checks to see if autoremind users are still in their guilds.",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export async function execute(interaction) {
    await interaction.deferReply()

    // Get all registrations.
    const registrations = await collection.find({}).toArray()
    Logger.debug(`Fetched ${registrations.length} autoreminds from database.`)

    // Group registrations by guild (server_id)
    const guildGroups = new Map()
    for (const reg of registrations) {
        const serverId = reg.server_id
        const userId = reg.user_id
        if (!guildGroups.has(serverId)) {
            guildGroups.set(serverId, [])
        }
        guildGroups.get(serverId).push(userId)
    }
    Logger.debug(`Grouped into ${guildGroups.size} guild groups.`)

    const finalOutput = []
    let processedGuilds = 0

    for (const [serverId, userIds] of guildGroups.entries()) {
        processedGuilds++
        Logger.debug(
            `Processing guild ${serverId} (${processedGuilds}/${guildGroups.size}) with ${userIds.length} users.`,
        )
        const guild = await interaction.client.guilds.cache.get(serverId)
        if (!guild) {
            Logger.debug(
                `Could not fetch guild ${serverId}. Marking all ${userIds.length} users as missing.`,
            )
        } else {
            Logger.debug(`Fetched guild: ${guild.name} (${serverId}).`)
        }

        const missingUsers = []
        if (!guild) {
            for (const userId of userIds) {
                missingUsers.push(`* User ID \`${userId}\` (bot not in guild)`)
            }
        } else {
            for (const userId of userIds) {
                try {
                    await guild.members.fetch(userId)
                } catch (err) {
                    missingUsers.push(
                        `* User ID \`${userId}\` is no longer in this guild.`,
                    )
                    Logger.debug(
                        `User \`${userId}\` is missing from guild ${guild.name} (${serverId}).`,
                    )
                }
            }
        }
        if (missingUsers.length > 0) {
            const header = guild
                ? `**Guild: ${guild.name} (${serverId})**`
                : `**Guild: Unknown (Bot not in guild) - ${serverId}**`
            finalOutput.push(header)
            finalOutput.push(...missingUsers)
            finalOutput.push("")
        }
    }

    if (finalOutput.length === 0) {
        finalOutput.push("All autoremind users are still in their guilds.")
    }

    const result = finalOutput.join("\n")
    if (result.length > 1900) {
        const buffer = Buffer.from(result, "utf-8")
        await interaction.editReply({
            content: "Result too long, creating file instead.",
            files: [{ attachment: buffer, name: "results.txt" }],
        })
    } else {
        await interaction.editReply({ content: result })
    }
}
