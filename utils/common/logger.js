import chalk from "chalk"
import moment from "moment-timezone"

/**
 * Gets the current timestamp in Sydney timezone
 * @returns {string} Formatted timestamp string (YYYY-MM-DD HH:mm:ss)
 */
const getTimestamp = () => {
    return moment().tz("Australia/Sydney").format("YYYY-MM-DD HH:mm:ss")
}

/**
 * Color definitions for different log levels
 */
const levels = {
    info: chalk.blue,
    warn: chalk.yellow,
    error: chalk.red.bold,
    success: chalk.green,
    debug: chalk.magenta,
}

function getCallerInfo() {
    const stackTrace = new Error().stack
    const stackLines = stackTrace.split("\n")

    // Skip the first two lines (Error and getCallerInfo function)
    // Then find the first line that's not from the logger itself
    for (let i = 2; i < stackLines.length; i++) {
        const line = stackLines[i].trim()
        // Skip if this is from the Logger class
        if (!line.includes("logger.js")) {
            // Extract filename from the stack trace
            const match =
                line.match(/at .*\((.*):(\d+):(\d+)\)/) ||
                line.match(/at (.*):(\d+):(\d+)/)

            if (match) {
                const fullPath = match[1]
                // Extract just the filename from the path without extension
                const fileName = fullPath
                    .split("\\")
                    .pop()
                    .split("/")
                    .pop()
                    .split(".")[0]
                return fileName
            }
            break
        }
    }
    return "unknown"
}

const white = chalk.white

// Debug mode flag - controls whether debug messages are displayed
let debugMode = false

/**
 * Logger utility for consistent formatted logging
 * Supports different log levels with color coding and timestamps
 */
export const Logger = {
    /**
     * Logs an informational message
     * @param {string} message - The message to log
     */
    info: (message) => {
        const callerInfo = getCallerInfo()
        console.log(
            `${levels.info(`[${getTimestamp()}] INFO [${callerInfo}]:`)} ${white(message)}`,
        )
    },

    /**
     * Logs a warning message
     * @param {string} message - The message to log
     */
    warn: (message) => {
        const callerInfo = getCallerInfo()
        console.warn(
            `${levels.warn(`[${getTimestamp()}] WARN [${callerInfo}]:`)} ${white(message)}`,
        )
    },
    /**
     * Logs an error message
     * @param {string} message - The message to log
     */
    error: (message) => {
        const callerInfo = getCallerInfo()
        console.error(
            `${levels.error(`[${getTimestamp()}] ERROR [${callerInfo}]:`)} ${white(message)}`,
        )
    },
    /**
     * Logs a success message
     * @param {string} message - The message to log
     */
    success: (message) => {
        const callerInfo = getCallerInfo()
        console.log(
            `${levels.success(`[${getTimestamp()}] SUCCESS [${callerInfo}]:`)} ${white(message)}`,
        )
    },
    /**
     * Logs a debug message (only if debug mode is enabled)
     * @param {string} message - The message to log
     */
    debug: (message) => {
        // Only log debug messages if debug mode is enabled
        if (debugMode) {
            const callerInfo = getCallerInfo()
            console.log(
                `${levels.debug(`[${getTimestamp()}] DEBUG [${callerInfo}]:`)} ${white(message)}`,
            )
        }
    },
    /**
     * Enables debug logging
     */
    enableDebug() {
        debugMode = true
    },
    /**
     * Disables debug logging
     */
    disableDebug() {
        debugMode = false
    },
}
