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

/**
 * Parses a time string into hours, minutes, and seconds components
 * @param {string} amount - The time string to parse. Can be in formats:
 *   - Plain number (e.g., "5") - interpreted as minutes
 *   - Single unit (e.g., "5h", "30m", "45s")
 *   - Multiple units (e.g., "1h30m", "2h15m30s", "90s45s")
 * @returns {Array} Array containing [hours, minutes, seconds]
 *   - Returns [0, 0, 0] for invalid formats
 *   - Normalizes values (e.g., 90s becomes [0, 1, 30])
 */
export function parseTimeString(amount) {
    const times = { h: 0, m: 0, s: 0 }

    if (/^\d+$/.test(amount)) {
        times.m = parseInt(amount, 10)
    } else {
        if (!/^\d+[hms](\d+[hms])*$/.test(amount)) {
            return [0, 0, 0]
        }

        const matches = amount.match(/(\d+)([hms])/g) || []

        matches.forEach((match) => {
            const value = parseInt(match.slice(0, -1), 10)
            const unit = match.slice(-1)
            times[unit] = value
        })
    }

    if (times.s >= 60) {
        times.m += Math.floor(times.s / 60)
        times.s = times.s % 60
    }

    if (times.m >= 60) {
        times.h += Math.floor(times.m / 60)
        times.m = times.m % 60
    }

    return [times.h, times.m, times.s]
}