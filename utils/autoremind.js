import { MongoClient } from "mongodb"

import { DATABASE_CONFIG } from "../config.js"
import { Logger } from "./logger.js"

// MongoDB client setup
const client = new MongoClient(DATABASE_CONFIG.MONGODB.URI)
const database = client.db(DATABASE_CONFIG.MONGODB.DB_NAME)
const collection = database.collection(
    DATABASE_CONFIG.MONGODB.COLLECTIONS.AUTO_REMIND,
)

/**
 * Sets an auto reminder for a user
 * @param {string} userId - The Discord user ID
 * @param {string} channelId - The Discord channel ID
 * @param {string} serverId - The Discord server ID
 * @param {string} reminderType - The type of reminder ("pound" or "laf")
 * @param {number} minutes - The number of minutes before opening
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function setAutoReminder(
    userId,
    channelId,
    serverId,
    reminderType,
    minutes,
) {
    try {
        const documentExists = await collection.findOne({
            user_id: userId,
        })

        if (documentExists) {
            await collection.updateOne(
                { user_id: userId },
                {
                    $set: {
                        [reminderType]: minutes,
                        channel_id: channelId,
                        server_id: serverId,
                    },
                },
            )
            return true
        }

        await collection.insertOne({
            server_id: serverId,
            channel_id: channelId,
            user_id: userId,
            pound: reminderType === "pound" ? minutes : 0,
            laf: reminderType === "laf" ? minutes : 0,
        })

        return true
    } catch (error) {
        Logger.error(`Error setting auto reminder: ${error.message}`)
        return false
    }
}

/**
 * Removes an auto reminder for a user
 * @param {string} userId - The Discord user ID
 * @param {string} reminderType - The type of reminder ("pound" or "laf")
 * @returns {Promise<{success: boolean, previousTime: number}>} Result object with success status and previous time
 */
export async function removeAutoReminder(userId, reminderType) {
    try {
        const result = await collection.findOneAndUpdate(
            { user_id: userId },
            { $set: { [reminderType]: 0 } },
            { returnDocument: "before" },
        )

        if (!result) {
            return { success: false, previousTime: 0 }
        }

        return {
            success: true,
            previousTime: result[reminderType] || 0,
        }
    } catch (error) {
        Logger.error(`Error removing auto reminder: ${error.message}`)
        return { success: false, previousTime: 0 }
    }
}
