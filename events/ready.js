import { Events } from "discord.js"

import { openingCountdown } from "../tasks/openingCountdown.js"
import { login } from "../utils/auth.js"
import {
    ItemDB,
    PetDB,
    sequelize,
    updateAutoRemindTimes,
} from "../utils/database.js"
import { Logger } from "../utils/logger.js"

export const name = Events.ClientReady
export const once = true

export async function execute(client) {
    try {
        Logger.info("Connecting to SQLite database...")
        await sequelize.authenticate()
        Logger.success("Connected to SQLite database")
    } catch (error) {
        Logger.error("Unable to connect to the database", error)
    }
    Logger.info("Synchronising databases...")
    await PetDB.sync()
    Logger.success("Synced Pet database")

    await ItemDB.sync()
    Logger.success("Synced Item database")

    Logger.info("Logging in to Chicken Smoothie...")
    await login()

    Logger.info("Setting auto remind times...")
    await updateAutoRemindTimes()

    Logger.info("Running openingCountdown background task...")
    await openingCountdown(client)

    Logger.info(`Ready! Logged in as ${client.user.tag}`)
}
