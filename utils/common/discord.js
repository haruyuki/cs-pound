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
    } catch (_) {
        // Member doesn't exist
        return false
    }
}
