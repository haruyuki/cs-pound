import chalk from "chalk"
import moment from "moment-timezone"

const getTimestamp = () => {
    return moment().tz("Australia/Sydney").format("YYYY-MM-DD HH:mm:ss")
}

const levels = {
    info: chalk.blue,
    warn: chalk.yellow,
    error: chalk.red.bold,
    success: chalk.green,
    debug: chalk.magenta,
}

const white = chalk.white

export const Logger = {
    info: (message) =>
        console.log(
            `${levels.info(`[${getTimestamp()}] INFO:`)} ${white(message)}`,
        ),
    warn: (message) =>
        console.warn(
            `${levels.warn(`[${getTimestamp()}] WARN:`)} ${white(message)}`,
        ),
    error: (message) =>
        console.error(
            `${levels.error(`[${getTimestamp()}] ERROR:`)} ${white(message)}`,
        ),
    success: (message) =>
        console.log(
            `${levels.success(`[${getTimestamp()}] SUCCESS:`)} ${white(message)}`,
        ),
    debug: (message) =>
        console.log(
            `${levels.debug(`[${getTimestamp()}] DEBUG:`)} ${white(message)}`,
        ),
}
