import { Events } from "discord.js"

import {
    ItemDB,
    login,
    PetDB,
    sequelize,
    updateAutoRemindTimes,
} from "../lib.js"
import { Logger } from "../logger.js"
import { openingCountdown } from "../tasks/openingCountdown.js"

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

    Logger.info(`Ready! Logged in as ${client.user.tag}`)
}
