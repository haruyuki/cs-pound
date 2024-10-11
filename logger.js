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

export const Logger = {
    info: (message) =>
        console.log(`${levels.info(`[INFO ${getTimestamp()}]: ${message}`)}`),
    warn: (message) =>
        console.warn(`${levels.warn(`[WARN ${getTimestamp()}]: ${message}`)}`),
    error: (message) =>
        console.error(
            `${levels.error(`[ERROR ${getTimestamp()}]: ${message}`)}`,
        ),
    success: (message) =>
        console.log(
            `${levels.success(`[SUCCESS ${getTimestamp()}]: ${message}`)}`,
        ),
    debug: (message) =>
        console.log(`${levels.debug(`[DEBUG ${getTimestamp()}]: ${message}`)}`),
}
