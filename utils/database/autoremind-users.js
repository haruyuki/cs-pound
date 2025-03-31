import { performance } from "node:perf_hooks"
import { MongoClient } from "mongodb"

import { DATABASE_CONFIG } from "../../config.js"
import { Logger } from "../common/logger.js"

// MongoDB client setup
const client = new MongoClient(DATABASE_CONFIG.MONGODB.URI)
const database = client.db(DATABASE_CONFIG.MONGODB.DB_NAME)
const collection = database.collection(
    DATABASE_CONFIG.MONGODB.COLLECTIONS.AUTO_REMIND,
)

/**
 * Fetches all autoremind users from the database with their server IDs
 * @returns {Promise<Array>} Array of documents containing user_id and server_id
 */
export async function fetchAllAutoremindUsers() {
    try {
        const startTime = performance.now()

        // Get all registrations with only necessary fields
        const registrations = await collection
            .find({}, { projection: { server_id: 1, user_id: 1 } })
            .toArray()

        const endTime = performance.now()
        Logger.debug(
            `Fetched ${registrations.length} autoreminds from database (${Math.round(endTime - startTime)}ms).`,
        )

        return registrations
    } catch (error) {
        Logger.error(`Error fetching autoremind users: ${error.message}`)
        return []
    }
}

/**
 * Groups autoremind users by their server ID
 * @param {Array} registrations - Array of autoremind registrations
 * @returns {Map} Map of server IDs to arrays of user objects
 */
export function groupUsersByGuild(registrations) {
    try {
        // Group registrations by guild (server_id)
        const guildGroups = registrations.reduce((groups, reg) => {
            const serverId = reg.server_id
            if (!groups.has(serverId)) {
                groups.set(serverId, [])
            }
            groups.get(serverId).push({ userId: reg.user_id, docId: reg._id })
            return groups
        }, new Map())

        Logger.debug(`Grouped into ${guildGroups.size} guild groups.`)
        return guildGroups
    } catch (error) {
        Logger.error(`Error grouping users by guild: ${error.message}`)
        return new Map()
    }
}

/**
 * Checks if a user exists in a guild
 * @param {Object} guild - The Discord guild object
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} True if the user exists in the guild, false otherwise
 */
export async function checkUserInGuild(guild, userId) {
    try {
        // Try to fetch the member
        await guild.members.fetch(userId)
        return true
    } catch (err) {
        // Member doesn't exist
        return false
    }
}

/**
 * Removes users from the autoremind database
 * @param {Array<string>} userIds - Array of user IDs to remove
 * @returns {Promise<Object>} Object containing the number of deleted documents
 */
export async function removeMissingUsers(userIds) {
    try {
        const startTime = performance.now()

        // Remove users from database
        const deleteResult = await collection.deleteMany({
            user_id: { $in: userIds },
        })

        const endTime = performance.now()
        Logger.debug(
            `Removed ${deleteResult.deletedCount} users from database (${Math.round(endTime - startTime)}ms).`,
        )

        return deleteResult
    } catch (error) {
        Logger.error(`Error removing users from database: ${error.message}`)
        return { deletedCount: 0 }
    }
}
