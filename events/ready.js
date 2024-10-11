import { Events } from "discord.js"

import { ItemDB, PetDB, sequelize } from "../lib.js"
import { Logger } from "../logger.js"

export const name = Events.ClientReady
export const once = true

export async function execute(client) {
    try {
        await sequelize.authenticate()
        Logger.success("SQLite database connection established successfully.")
    } catch (error) {
        Logger.error("Unable to connect to the database.", error)
    }
    Logger.info("Synchronising databases...")
    await PetDB.sync()
    Logger.success("Synced PetDB")

    await ItemDB.sync()
    Logger.success("Synced ItemDB")

    console.info(`Ready! Logged in as ${client.user.tag}`)
}
