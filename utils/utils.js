/**
 * General utility functions for the CS Pound bot
 */

/**
 * Formats time components into a human-readable string
 * @param {Array} timeComponents - Array containing [hours, minutes, seconds]
 * @returns {string} Formatted time string
 */
export function formatter([h, m, s]) {
    const parts = [
        h && `${h} hour${h > 1 ? "s" : ""}`,
        m && `${m} minute${m > 1 ? "s" : ""}`,
        s && `${s} second${s > 1 ? "s" : ""}`,
    ].filter(Boolean)

    return parts
        .join(parts.length > 1 ? ", " : "")
        .replace(/,([^,]*)$/, " and$1")
}
