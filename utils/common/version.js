/**
 * Utility for generating version information based on Git commit dates
 */

import { execSync } from "child_process"

import { Logger } from "./logger.js"

/**
 * Gets the latest Git commit date and hash, and formats it as a version string (YYYY.MM.DD (Git hash))
 * @returns {string} Formatted version string based on latest commit date and hash
 */
export function getVersionFromGit() {
    try {
        // Get the latest commit date in ISO format
        const commitDate = execSync("git log -1 --format=%cd --date=iso")
            .toString()
            .trim()

        // Get the latest commit hash
        const commitHash = execSync("git log -1 --format=%h").toString().trim()

        // Parse the date in UTC to avoid timezone issues
        const date = new Date(commitDate)

        // Format as YYYY.MM.DD (Git hash) using UTC methods to ensure consistency
        const year = date.getUTCFullYear()
        const month = String(date.getUTCMonth() + 1).padStart(2, "0")
        const day = String(date.getUTCDate()).padStart(2, "0")

        return `${year}.${month}.${day} (${commitHash})`
    } catch (error) {
        // Log the error but re-throw it so getVersion can handle it
        Logger.error("Failed to get version from Git:", error.message)
        throw error
    }
}

/**
 * Gets the version string, either from Git or from a fallback value
 * @param {string} fallbackVersion - Version to use if Git command fails
 * @returns {string} The version string
 */
export function getVersion(fallbackVersion = "0000.00.00") {
    try {
        return getVersionFromGit()
    } catch (error) {
        Logger.error("Failed to get version:", error.message)
        return fallbackVersion
    }
}
