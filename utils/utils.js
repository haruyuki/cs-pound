/**
 * General utility functions for the CS Pound bot
 */

/**
 * Formats time components into a human-readable string
 * @param {Array} timeComponents - Array containing [hours, minutes, seconds]
 * @returns {string} Formatted time string
 */
export function formatter([h, m, s]) {
    return [
        h ? `${h} hour${h > 1 ? "s" : ""}${m || s ? ", " : ""}` : "",
        m ? `${m} minute${m > 1 ? "s" : ""}${s ? " and " : ""}` : "",
        s ? `${h || m ? "and " : ""}${s} second${s > 1 ? "s" : ""}` : "",
    ].join("")
}