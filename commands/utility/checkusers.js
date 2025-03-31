import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js"

import { Logger } from "../../utils/common/logger.js"
import {
    checkUserInGuild,
    fetchAllAutoremindUsers,
    groupUsersByGuild,
    removeMissingUsers,
} from "../../utils/database/autoremind-users.js"

export const data = new SlashCommandBuilder()
    .setName("checkusers")
    .setDescription(
        "Checks to see if autoremind users are still in their guilds.",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export async function execute(interaction) {
    await interaction.deferReply()

    // Get all registrations with only necessary fields
    const registrations = await fetchAllAutoremindUsers()

    // Group registrations by guild (server_id) more efficiently
    const guildGroups = groupUsersByGuild(registrations)

    const finalOutput = []
    // Track missing users for potential removal
    const missingUserRecords = []
    let processedGuilds = 0

    // Process guilds in parallel with a concurrency limit
    const BATCH_SIZE = 5
    const guildEntries = Array.from(guildGroups.entries())

    for (let i = 0; i < guildEntries.length; i += BATCH_SIZE) {
        const batch = guildEntries.slice(i, i + BATCH_SIZE)

        // Process this batch of guilds in parallel
        await Promise.all(
            batch.map(async ([serverId, userIds]) => {
                processedGuilds++
                Logger.debug(
                    `Processing guild ${serverId} (${processedGuilds}/${guildGroups.size}) with ${userIds.length} users.`,
                )

                const guild = interaction.client.guilds.cache.get(serverId)
                if (!guild) {
                    Logger.debug(
                        `Could not fetch guild ${serverId}. Marking all ${userIds.length} users as missing.`,
                    )

                    // All users are missing if guild is not found
                    const missingUsers = userIds.map((user) => {
                        // Add to missing users list for potential removal
                        missingUserRecords.push(user)
                        return `* User ID \`${user.userId}\` (bot not in guild)`
                    })

                    if (missingUsers.length > 0) {
                        const header = `**Guild: Unknown (Bot not in guild) - ${serverId}**`
                        finalOutput.push(header, ...missingUsers, "")
                    }
                    return
                }

                Logger.debug(`Fetched guild: ${guild.name} (${serverId}).`)

                // Process users in batches to avoid rate limiting
                const USER_BATCH_SIZE = 25
                const missingUsers = []

                for (let j = 0; j < userIds.length; j += USER_BATCH_SIZE) {
                    const userBatch = userIds.slice(j, j + USER_BATCH_SIZE)

                    // Process this batch of users in parallel
                    const userChecks = await Promise.allSettled(
                        userBatch.map(async (userId) => {
                            const exists = await checkUserInGuild(
                                guild,
                                userId.userId,
                            )
                            return { user: userId, exists }
                        }),
                    )

                    // Process results from this batch
                    for (const result of userChecks) {
                        if (
                            result.status === "fulfilled" &&
                            !result.value.exists
                        ) {
                            const user = result.value.user
                            missingUsers.push(
                                `* User ID \`${user.userId}\` is no longer in this guild.`,
                            )
                            // Add to missing users list for potential removal
                            missingUserRecords.push(user)
                            Logger.debug(
                                `User \`${user.userId}\` is missing from guild ${guild.name} (${serverId}).`,
                            )
                        }
                    }

                    // Small delay between user batches to avoid rate limiting
                    if (j + USER_BATCH_SIZE < userIds.length) {
                        await new Promise((resolve) => setTimeout(resolve, 100))
                    }
                }

                if (missingUsers.length > 0) {
                    const header = `**Guild: ${guild.name} (${serverId})**`
                    finalOutput.push(header, ...missingUsers, "")
                }
            }),
        )
    }

    if (finalOutput.length === 0) {
        finalOutput.push("All autoremind users are still in their guilds.")
        await interaction.editReply({
            content: "All autoremind users are still in their guilds.",
        })
        return
    }

    const result = finalOutput.join("\n")
    const missingCount = missingUserRecords.length

    // Create buttons for user interaction
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("remove_users")
            .setLabel(
                `Remove ${missingCount} missing user${missingCount !== 1 ? "s" : ""}`,
            )
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId("cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary),
    )

    let message
    if (result.length > 1900) {
        const buffer = Buffer.from(result, "utf-8")
        message = await interaction.editReply({
            content: `Result too long, creating file instead. Found ${missingCount} missing user${missingCount !== 1 ? "s" : ""}. Would you like to remove them from the database?`,
            files: [{ attachment: buffer, name: "results.txt" }],
            components: [row],
        })
    } else {
        message = await interaction.editReply({
            content: `${result}\n\nFound ${missingCount} missing user${missingCount !== 1 ? "s" : ""}. Would you like to remove them from the database?`,
            components: [row],
        })
    }

    try {
        // Wait for button interaction
        const confirmation = await message.awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id,
            time: 60000,
            componentType: ComponentType.Button,
        })

        if (confirmation.customId === "remove_users") {
            await confirmation.update({
                content: "Removing users from database...",
                components: [],
            })

            // Extract document IDs for removal
            const userIds = missingUserRecords.map((user) => user.userId)

            // Remove users from database using utility function
            const deleteResult = await removeMissingUsers(userIds)

            await interaction.editReply({
                content: `Successfully removed ${deleteResult.deletedCount} user${deleteResult.deletedCount !== 1 ? "s" : ""} from the database.`,
                components: [],
                files:
                    message.attachments.size > 0
                        ? Array.from(message.attachments.values())
                        : [],
            })
        } else {
            await confirmation.update({
                content: "Operation cancelled.",
                components: [],
            })

            // Restore the original message
            await interaction.editReply({
                content:
                    result.length > 1900
                        ? "Result too long, creating file instead."
                        : result,
                components: [],
                files:
                    message.attachments.size > 0
                        ? Array.from(message.attachments.values())
                        : [],
            })
        }
    } catch (e) {
        // Timeout or error
        await interaction.editReply({
            content: "Button interaction timed out or failed.",
            components: [],
            files:
                message.attachments.size > 0
                    ? Array.from(message.attachments.values())
                    : [],
        })
        Logger.error(`Button interaction error: ${e}`)
    }
}
