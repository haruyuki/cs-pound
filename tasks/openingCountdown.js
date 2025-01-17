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
    // Fetch getOpeningTime until the cooldown starts (within 1 hour)
    if (!lessThanOneHourRemaining) {
        const openingTime = await getOpeningTime()

        if (openingTime != null) {
            openingType = openingTime.openingType
            timeRemaining = openingTime.timeRemaining
        }

        if (timeRemaining === 0) {
            // Reset timer to 60 minutes after the event opens
            timeoutTime = 60
        } else if (timeRemaining <= 61) {
            lessThanOneHourRemaining = true
            // Switch to 1-minute intervals
            timeoutTime = 1
        } else if (timeRemaining === 600) {
            timeoutTime = 60
        } else if (timeRemaining >= 180) {
            timeoutTime = timeRemaining - 120
        } else {
            timeoutTime = timeRemaining - 59
        }
    }

    // If within 1 hour, enter the cooldown loop
    if (lessThanOneHourRemaining) {
        if (timeRemaining === 0) {
            lessThanOneHourRemaining = false
            // Reset timer to 60 minutes after the event opens
            timeoutTime = 60
            await updateAutoRemindTimes()
        } else {
            let CURRENT_REMIND_TIMES =
                openingType === "pound" ? POUND_REMIND_TIMES : LAF_REMIND_TIMES
            CURRENT_REMIND_TIMES = CURRENT_REMIND_TIMES.filter(
                (time) => time !== 0,
            )

            // Only fetch reminders when timeRemaining matches a reminder time
            if (CURRENT_REMIND_TIMES.includes(timeRemaining)) {
                // Fetch only if timeRemaining matches reminder times
                const documents = await getAutoRemindDocuments(
                    timeRemaining,
                    openingType,
                )
                const channelIDs = new Set(
                    documents.map((doc) => doc.channel_id),
                )

                // Send reminders for all channels
                for (const channelID of channelIDs) {
                    setTimeout(async () => {
                        let channel = null
                        try {
                            channel = await client.channels.fetch(channelID)
                        } catch (error) {
                            Logger.error(
                                `Failed to fetch channel ${channelID}: ${error.message}`,
                            )
                        }

                        if (channel !== null) {
                            const filteredDocuments = documents.filter(
                                (doc) => doc.channel_id === channelID,
                            )
                            await sendReminderToChannel(
                                channel,
                                timeRemaining,
                                openingType,
                                filteredDocuments,
                            )
                        }
                    }, 5000)
                    // 5s delay between each channel to prevent rate limiting
                }
            }

            timeoutTime = 1
            timeRemaining--
        }
    }

    // Schedule the next run
    setTimeout(openingCountdown, timeoutTime * 60000, client)
}

// Helper function to send reminders
async function sendReminderToChannel(
    channel,
    minutesLeft,
    openingType,
    documents,
) {
    minutesLeft++
    const messagePrefix = `${minutesLeft} minute${minutesLeft > 1 ? "s" : ""} until the ${openingType} opens! `
    const filteredUsers = documents.map((doc) => `<@${doc.user_id}>`)

    const maxMessageLength = 2000
    let currentMessage = messagePrefix
    let currentMessageLength = messagePrefix.length
    let usersBatch = []

    // Proceed with sending messages
    filteredUsers.forEach((user) => {
        if (currentMessageLength + user.length + 1 > maxMessageLength) {
            // Send the current message if adding the next user exceeds the limit
            channel.send(currentMessage + usersBatch.join(" "))

            // Reset for the next message batch
            currentMessage = messagePrefix
            currentMessageLength = messagePrefix.length
            usersBatch = []
        }

        // Add the current user to the message batch
        usersBatch.push(user)
        currentMessageLength += user.length + 1
    })

    // Send any remaining users in the last message
    if (usersBatch.length > 0) {
        channel.send(currentMessage + usersBatch.join(" "))
    }
}
