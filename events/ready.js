import { Events } from "discord.js"

import { BOT_VERSION } from "../config.js"
import { setupAutomaticCleanup } from "../tasks/cacheCleanup.js"
import { openingCountdown } from "../tasks/openingCountdown.js"
import { login } from "../utils/api/auth.js"
import { CacheType } from "../utils/cache/singleton.js"
import { Logger } from "../utils/common/logger.js"
import {
    ItemDB,
    PetDB,
    sequelize,
} from "../utils/database/chickensmoothie-db.js"
import { updateAutoRemindTimes } from "../utils/database/mongo-db.js"

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

    Logger.info("Running cacheCleanup background task...")
    setupAutomaticCleanup(CacheType.MEMORY)
    setupAutomaticCleanup(CacheType.SQLITE)

    Logger.success(
        `Ready! Logged in as ${client.user.tag} running version ${BOT_VERSION}`,
    )
}
