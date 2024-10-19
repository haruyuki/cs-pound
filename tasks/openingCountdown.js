import {
    getAutoRemindDocuments,
    getOpeningTime,
    LAF_REMIND_TIMES,
    POUND_REMIND_TIMES,
    updateAutoRemindTimes,
} from "../lib.js"
import { Logger } from "../logger.js"

let lessThanOneHourRemaining = false
let timeoutTime = 60
let openingType = null
let timeRemaining = 0

export async function openingCountdown(client) {
    Logger.info("Running opening countdown background task")

    // Fetch getOpeningTime until the cooldown starts (within 1 hour)
    if (!lessThanOneHourRemaining) {
        Logger.debug("Task not on cooldown")

        const openingTime = await getOpeningTime()
        Logger.debug("Retrieved opening time")

        if (openingTime != null) {
            openingType = openingTime.openingType
            timeRemaining = openingTime.timeRemaining
        }

        if (timeRemaining === 0) {
            Logger.debug(`The ${openingType} is currently open`)
            timeoutTime = 60 // Reset after the event opens
        } else if (timeRemaining <= 61) {
            Logger.debug(
                "Opening time is less than 60 minutes, entering COOLDOWN",
            )
            lessThanOneHourRemaining = true
            timeoutTime = 1 // Switch to 1-minute intervals
        } else if (timeRemaining >= 180) {
            Logger.debug("Opening time is greater than 3 hours")
            timeoutTime = timeRemaining - 120 // Schedule the next call 3 hours before opening
        } else {
            Logger.debug("Opening time is within 2 hours")
            timeoutTime = timeRemaining - 59 // Schedule the next call closer to 1 hour
        }

        Logger.debug(`Cooldown time set to ${timeoutTime} minutes`)
    }

    // If within 1 hour, enter the cooldown loop
    if (lessThanOneHourRemaining) {
        Logger.debug(
            `Less than 1 hour remaining (${timeRemaining}), checking for reminders`,
        )
        if (timeRemaining === 0) {
            Logger.debug(`The ${openingType} is now open, disabling COOLDOWN`)
            lessThanOneHourRemaining = false
            timeoutTime = 60 // Reset after the event opens
            await updateAutoRemindTimes()
        } else {
            let CURRENT_REMIND_TIMES =
                openingType === "pound" ? POUND_REMIND_TIMES : LAF_REMIND_TIMES
            CURRENT_REMIND_TIMES = CURRENT_REMIND_TIMES.filter(
                (time) => time !== 0,
            )

            // Only fetch reminders when timeRemaining matches a reminder time
            if (CURRENT_REMIND_TIMES.includes(timeRemaining)) {
                Logger.debug(
                    `Sending reminder at ${timeRemaining} minutes for ${openingType}`,
                )

                // Fetch only if timeRemaining matches reminder times
                const documents = await getAutoRemindDocuments(
                    timeRemaining,
                    openingType,
                )
                let channelIDs = new Set(documents.map((doc) => doc.channel_id))

                // Send reminders for all channels
                channelIDs.forEach((channelID) => {
                    setTimeout(
                        async () =>
                            await sendReminderToChannel(
                                client,
                                channelID,
                                timeRemaining,
                                openingType,
                                documents,
                            ),
                        5000,
                    ) // 5s delay between each
                })
            }

            timeoutTime = 1 // Keep checking every minute during the cooldown
            timeRemaining-- // Adjust cached time for countdown
        }
    }

    // Schedule the next run
    setTimeout(openingCountdown, timeoutTime * 60000)
}

// Helper function to send reminders
async function sendReminderToChannel(
    client,
    channelID,
    timeRemaining,
    openingType,
    documents,
) {
    Logger.debug(`Attempting to send message to channel ${channelID}`)

    const messagePrefix = `${timeRemaining} minute${timeRemaining > 1 ? "s" : ""} until the ${openingType} opens! `
    const filteredUsers = documents.map((doc) => `<@${doc.user_id}>`)

    const maxMessageLength = 2000
    let currentMessage = messagePrefix
    let currentMessageLength = messagePrefix.length
    let usersBatch = []

    // First, try to get the channel from the cache
    let channel = client.channels.cache.get(channelID)

    // If the channel is not in cache, fetch it from the API
    if (!channel) {
        Logger.debug(
            `Channel ${channelID} not found in cache, fetching from API`,
        )
        try {
            channel = await client.channels.fetch(channelID)
        } catch (error) {
            Logger.error(
                `Failed to fetch channel ${channelID}: ${error.message}`,
            )
            return // Exit the function if the channel couldn't be fetched
        }
    }

    // If the channel is successfully retrieved, proceed with sending messages
    if (channel) {
        filteredUsers.forEach((user, index) => {
            if (currentMessageLength + user.length + 1 > maxMessageLength) {
                // Send the current message if adding the next user exceeds the limit
                Logger.debug(
                    `Message to send: ${currentMessage} ${usersBatch.join(" ")}`,
                )
                channel.send(currentMessage + usersBatch.join(" ")) // Sending the message

                // Reset for the next message batch
                currentMessage = messagePrefix
                currentMessageLength = messagePrefix.length
                usersBatch = []
            }

            // Add the current user to the message batch
            usersBatch.push(user)
            currentMessageLength += user.length + 1 // +1 for the space
        })

        // Send any remaining users in the last message
        if (usersBatch.length > 0) {
            Logger.debug(
                `Message to send: ${currentMessage} ${usersBatch.join(" ")}`,
            )
            channel.send(currentMessage + usersBatch.join(" ")) // Sending the final message batch
        }
    } else {
        Logger.error(`Channel ${channelID} could not be found or fetched`)
    }
}
