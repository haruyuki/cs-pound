import { Logger } from "./logger.js"

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
