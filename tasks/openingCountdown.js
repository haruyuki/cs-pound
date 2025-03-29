import { performance } from "node:perf_hooks"

import { TASK_CONFIG } from "../config.js"
import { getOpeningTime } from "../utils/chickensmoothie.js"
import {
    getAutoRemindDocuments,
    LAF_REMIND_TIMES,
    POUND_REMIND_TIMES,
    updateAutoRemindTimes,
} from "../utils/database.js"
import { Logger } from "../utils/logger.js"

let lessThanOneHourRemaining = false
let timeoutTime = 60
let openingType = null
let timeRemaining = 0

export async function openingCountdown(client) {
    const startTime = performance.now()
    try {
        // Fetch getOpeningTime until the cooldown starts (within 1 hour)
        if (!lessThanOneHourRemaining) {
            Logger.debug("Checking opening time status")
            const openingTime = await getOpeningTime()

            if (openingTime != null) {
                openingType = openingTime.openingType
                timeRemaining = openingTime.timeRemaining
                Logger.debug(
                    `Opening type: ${openingType}, Time remaining: ${timeRemaining} minutes`,
                )
            } else {
                Logger.debug("No opening time available")
            }

            // Optimize the timeout calculation
            if (timeRemaining === 0) {
                // Reset timer to 60 minutes after the event opens
                timeoutTime = 60
            } else if (timeRemaining <= 61) {
                lessThanOneHourRemaining = true
                // Switch to 1-minute intervals when close to opening
                timeoutTime = 1
                Logger.info(
                    `${openingType} opening soon! Switching to minute-by-minute updates`,
                )
            } else {
                // Dynamic scheduling based on time remaining
                // More frequent checks as we get closer to opening time
                if (timeRemaining > 600) {
                    // > 10 hours
                    timeoutTime = Math.min(120, Math.floor(timeRemaining / 10))
                } else if (timeRemaining > 180) {
                    // 3-10 hours
                    timeoutTime = Math.min(60, Math.floor(timeRemaining / 5))
                } else {
                    // 1-3 hours
                    timeoutTime = Math.min(30, Math.floor(timeRemaining / 3))
                }
                Logger.debug(`Next check in ${timeoutTime} minutes`)
            }
        }

        // If within 1 hour, enter the cooldown loop with more precise timing
        if (lessThanOneHourRemaining) {
            if (timeRemaining === 0) {
                lessThanOneHourRemaining = false
                // Reset timer to 60 minutes after the event opens
                timeoutTime = 60
                Logger.info(`${openingType} has opened! Resetting timer`)
                await updateAutoRemindTimes()
            } else {
                // Get the appropriate remind times based on opening type
                const CURRENT_REMIND_TIMES =
                    openingType === "pound"
                        ? POUND_REMIND_TIMES
                        : LAF_REMIND_TIMES

                // Filter out 0 times and sort for better performance
                const validRemindTimes = CURRENT_REMIND_TIMES.filter(
                    (time) => time !== 0,
                ).sort((a, b) => a - b)

                // Only fetch reminders when timeRemaining matches a reminder time
                if (validRemindTimes.includes(timeRemaining)) {
                    Logger.info(
                        `Sending reminders for ${timeRemaining} minute(s) until ${openingType} opens`,
                    )

                    try {
                        // Fetch only if timeRemaining matches reminder times
                        const documents = await getAutoRemindDocuments(
                            timeRemaining,
                            openingType,
                        )

                        if (documents && documents.length > 0) {
                            // Group documents by channel for more efficient processing
                            const channelDocuments = new Map()

                            // Organize documents by channel
                            documents.forEach((doc) => {
                                if (!channelDocuments.has(doc.channel_id)) {
                                    channelDocuments.set(doc.channel_id, [])
                                }
                                channelDocuments.get(doc.channel_id).push(doc)
                            })

                            // Process each channel with a small delay to prevent rate limiting
                            let channelIndex = 0
                            for (const [
                                channelID,
                                channelDocs,
                            ] of channelDocuments.entries()) {
                                // Stagger the channel notifications to avoid rate limits
                                setTimeout(async () => {
                                    try {
                                        const channel =
                                            await client.channels.fetch(
                                                channelID,
                                            )
                                        if (channel) {
                                            await sendReminderToChannel(
                                                channel,
                                                timeRemaining,
                                                openingType,
                                                channelDocs,
                                            )
                                        }
                                    } catch (error) {
                                        Logger.error(
                                            `Failed to send reminder to channel ${channelID}: ${error.message}`,
                                        )
                                    }
                                }, channelIndex * TASK_CONFIG.OPENING_COUNTDOWN.REMINDER_STAGGER_DELAY)

                                channelIndex++
                            }
                        } else {
                            Logger.debug(
                                `No reminders to send for ${timeRemaining} minute(s)`,
                            )
                        }
                    } catch (error) {
                        Logger.error(
                            `Error fetching reminder documents: ${error.message}`,
                        )
                    }
                }

                timeoutTime = 1
                timeRemaining--
            }
        }

        // Schedule the next run with a more precise timer
        const nextRunTime = timeoutTime * 60000
        setTimeout(
            () =>
                openingCountdown(client).catch((err) => {
                    Logger.error(`Error in openingCountdown: ${err.message}`)
                    // Ensure the task continues even after an error
                    setTimeout(() => openingCountdown(client), 60000)
                }),
            nextRunTime,
        )

        const endTime = performance.now()
        Logger.debug(
            `openingCountdown execution time: ${Math.round(endTime - startTime)}ms`,
        )
    } catch (error) {
        Logger.error(`Unexpected error in openingCountdown: ${error.message}`)
        // Recover from unexpected errors by scheduling the next run
        setTimeout(() => openingCountdown(client), 60000)
    }
}

// Helper function to send reminders with optimized message batching
async function sendReminderToChannel(
    channel,
    minutesLeft,
    reminderOpeningType,
    documents,
) {
    try {
        const startTime = performance.now()

        // Increment minutes for display (since we're counting down)
        minutesLeft++

        // Create the message prefix
        const messagePrefix = `${minutesLeft} minute${minutesLeft > 1 ? "s" : ""} until the ${reminderOpeningType} opens! `

        // Extract user IDs efficiently
        const userIds = documents.map((doc) => doc.user_id)

        // Skip processing if no users to notify
        if (userIds.length === 0) {
            Logger.debug(`No users to notify in channel ${channel.id}`)
            return
        }

        // Constants for message batching
        const maxMessageLength = 2000
        const maxMentionsPerMessage =
            TASK_CONFIG.OPENING_COUNTDOWN.MAX_MENTIONS_PER_MESSAGE

        // Create user mention strings
        const userMentions = userIds.map((id) => `<@${id}>`)

        // Batch users into messages
        const messageBatches = []
        let currentBatch = []
        let currentLength = messagePrefix.length

        for (const mention of userMentions) {
            // Check if adding this mention would exceed limits
            if (
                currentBatch.length >= maxMentionsPerMessage ||
                currentLength + mention.length + 1 > maxMessageLength
            ) {
                // Save current batch and start a new one
                if (currentBatch.length > 0) {
                    messageBatches.push([...currentBatch])
                }
                currentBatch = []
                currentLength = messagePrefix.length
            }

            // Add mention to current batch
            currentBatch.push(mention)
            currentLength += mention.length + 1
        }

        // Add the last batch if it has any mentions
        if (currentBatch.length > 0) {
            messageBatches.push(currentBatch)
        }

        // Send all message batches with a small delay between them
        for (let i = 0; i < messageBatches.length; i++) {
            const batchMessage = messagePrefix + messageBatches[i].join(" ")

            try {
                await channel.send(batchMessage)

                // Add a small delay between messages to avoid rate limiting
                if (i < messageBatches.length - 1) {
                    await new Promise((resolve) =>
                        setTimeout(
                            resolve,
                            TASK_CONFIG.OPENING_COUNTDOWN.MESSAGE_BATCH_DELAY,
                        ),
                    )
                }
            } catch (error) {
                Logger.error(
                    `Failed to send message batch ${i + 1}/${messageBatches.length} to channel ${channel.id}: ${error.message}`,
                )
            }
        }

        const endTime = performance.now()
        Logger.debug(
            `Sent ${messageBatches.length} reminder messages to channel ${channel.id} with ${userIds.length} users (${Math.round(endTime - startTime)}ms)`,
        )
    } catch (error) {
        Logger.error(
            `Error in sendReminderToChannel for channel ${channel.id}: ${error.message}`,
        )
    }
}
