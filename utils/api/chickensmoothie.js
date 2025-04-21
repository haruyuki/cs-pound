import { performance } from "node:perf_hooks"

import { CS_CONFIG } from "../../config.js"
import { Logger } from "../common/logger.js"
import { formatOpeningTime, formatOpenMessage } from "../text/messages.js"
import { makeGETRequest } from "./webrequests.js"

/**
 * Gets the current opening time information for the Pound or Lost and Found
 * @returns {Promise<Object|null>} Object containing opening type, time remaining in minutes, and things remaining count,
 *                                or null if information couldn't be retrieved
 * @property {string} openingType - Either "pound" or "lost and found"
 * @property {number} timeRemaining - Time remaining in minutes until opening
 * @property {number} thingsRemaining - Number of pets/items remaining if already open
 */
export const getOpeningTime = async () => {
    try {
        const startTime = performance.now()

        // Make the request to the URL using axiosClient and the existing cookie jar
        const $ = await makeGETRequest(CS_CONFIG.URLS.POUND_LAF, { use: false })

        // Extract the last <h2> element's text content
        const text = $("h2:last-of-type").text().trim()

        // Check if the text refers to The Pound or Lost and Found
        const isPound = text === "The Pound"
        const isLostAndFound = text === "The Lost and Found"

        if (isPound || isLostAndFound) {
            // Select the corresponding remaining count based on the section (Pound or Lost and Found)
            const remainingSelector = isPound
                ? "#pets_remaining"
                : "#items_remaining"
            const thingsRemaining = parseNumber($(remainingSelector).text())

            const endTime = performance.now()
            Logger.debug(
                `getOpeningTime (open): ${Math.round(endTime - startTime)}ms`,
            )

            return {
                openingType: isPound ? "pound" : "lost and found",
                timeRemaining: 0,
                thingsRemaining,
            }
        }

        // Check for opening time using regex
        const match = text.match(
            /(pound|lost and found).*?(?:in:|within)\s*(?:(\d+)\s*hours?)?\s*(?:,?\s*(\d+)\s*minutes?)?/i,
        )

        if (match) {
            const [, openingType, hours, minutes] = match

            // Convert to minutes, defaulting undefined values to 0
            const timeInMinutes =
                (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0)

            return {
                openingType: openingType.toLowerCase(),
                timeRemaining: timeInMinutes,
                thingsRemaining: 0,
            }
        }

        // Return null if no match found
        return null
    } catch (error) {
        Logger.error("Error while getting opening time:", error.message)
        return null
    }
}

/**
 * Safely extracts and parses a number from a text string
 * @param {string} text - The text containing a number
 * @returns {number} The parsed integer or 0 if no number found
 */
const parseNumber = (text) => {
    const match = text.match(/\d+/)
    return match ? parseInt(match[0]) : 0
}

/**
 * Formats a response for the time command based on opening time information
 * @param {Object|null} openingTime - Opening time information object or null
 * @returns {string} Formatted response message
 */
export const formatTimeResponse = (openingTime) => {
    if (openingTime === null) {
        return "Sorry, both the Pound and Lost and Found are closed at the moment."
    }

    const openingType =
        openingTime.openingType === "pound" ? "Pound" : "Lost and Found"

    if (openingTime.timeRemaining === 0) {
        return formatOpenMessage(openingType, openingTime.thingsRemaining)
    }

    return formatOpeningTime(openingType, openingTime.timeRemaining)
}
