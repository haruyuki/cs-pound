/**
 * Utility functions for time formatting specific to CS Pound bot
 */

/**
 * Formats opening time for Pound or Lost and Found into a human-readable string
 * @param {string} openingType - The type of opening ("pound" or "lost and found")
 * @param {number} timeRemaining - Time remaining in minutes
 * @returns {string} Formatted time string for display
 */
export function formatOpeningTime(openingType, timeRemaining) {
    const hours = Math.floor(timeRemaining / 60)
    const minutes = timeRemaining % 60

    let result = ""

    if (hours > 0) {
        result += `The ${openingType} will open ${hours > 1 ? "within" : "in:"} ${hours} ${hours > 1 ? "hours" : "hour"}`
    }

    if (minutes > 0) {
        // If there are hours, format the minutes accordingly
        if (hours > 0) {
            result += `, ${minutes} ${minutes > 1 ? "minutes" : "minute"}.`
        } else {
            result += `The ${openingType} will open in: ${minutes} ${minutes > 1 ? "minutes" : "minute"}.`
        }
    } else {
        result += "."
    }

    return result.trim()
}

/**
 * Creates a message for when the Pound or Lost and Found is currently open
 * @param {string} openingType - The type of opening ("pound" or "lost and found")
 * @param {number} thingsRemaining - Number of pets/items remaining
 * @returns {string} Formatted message for display
 */
export function formatOpenMessage(openingType, thingsRemaining) {
    return `The ${openingType} is currently open with ${thingsRemaining} ${openingType === "Pound" ? "pets" : "items"} remaining! [Go ${openingType === "Pound" ? "adopt a pet" : "get an item"} from the ${openingType}!](https://www.chickensmoothie.com/poundandlostandfound.php)`
}
