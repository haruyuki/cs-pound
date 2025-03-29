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
    info: (message) =>
        console.log(
            `${levels.info(`[${getTimestamp()}] INFO:`)} ${white(message)}`,
        ),
    /**
     * Logs a warning message
     * @param {string} message - The message to log
     */
    warn: (message) =>
        console.warn(
            `${levels.warn(`[${getTimestamp()}] WARN:`)} ${white(message)}`,
        ),
    /**
     * Logs an error message
     * @param {string} message - The message to log
     */
    error: (message) =>
        console.error(
            `${levels.error(`[${getTimestamp()}] ERROR:`)} ${white(message)}`,
        ),
    /**
     * Logs a success message
     * @param {string} message - The message to log
     */
    success: (message) =>
        console.log(
            `${levels.success(`[${getTimestamp()}] SUCCESS:`)} ${white(message)}`,
        ),
    /**
     * Logs a debug message (only if debug mode is enabled)
     * @param {string} message - The message to log
     */
    debug: (message) => {
        // Only log debug messages if debug mode is enabled
        if (debugMode) {
            console.log(
                `${levels.debug(`[${getTimestamp()}] DEBUG:`)} ${white(message)}`,
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
