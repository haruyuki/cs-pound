import { readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { ActivityType, Client, Collection, GatewayIntentBits } from "discord.js"

import { DISCORD_CONFIG } from "./config.js"
import { Logger } from "./utils/common/logger.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const client = new Client({
    intents: DISCORD_CONFIG.INTENTS.map((intent) => GatewayIntentBits[intent]),
    presence: {
        activities: [
            {
                name: DISCORD_CONFIG.PRESENCE.ACTIVITY_NAME,
                type: ActivityType[DISCORD_CONFIG.PRESENCE.ACTIVITY_TYPE],
            },
        ],
    },
})

client.commands = new Collection()

// Function to load commands
async function loadCommands() {
    const foldersPath = join(__dirname, "commands")
    const commandFolders = readdirSync(foldersPath)

    for (const folder of commandFolders) {
        const commandsPath = join(foldersPath, folder)
        const commandFiles = readdirSync(commandsPath).filter((file) =>
            file.endsWith(".js"),
        )
        for (const file of commandFiles) {
            const filePath = pathToFileURL(join(commandsPath, file))
            const command = await import(filePath)
            if ("data" in command && "execute" in command) {
                client.commands.set(command.data.name, command)
                Logger.success(`Loaded command: ${command.data.name}`)
            } else {
                Logger.warn(
                    'The command at ${filePath} is missing a required "data" or "execute" property.',
                )
            }
        }
    }
}

// Function to load events
async function loadEvents() {
    const eventsPath = join(__dirname, "events")
    const eventFiles = readdirSync(eventsPath).filter((file) =>
        file.endsWith(".js"),
    )

    for (const file of eventFiles) {
        const filePath = pathToFileURL(join(eventsPath, file))
        const event = await import(filePath)
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args))
        } else {
            client.on(event.name, (...args) => event.execute(...args))
        }
        Logger.success(`Ran event: ${event.name}`)
    }
}

// Login and initialization
async function init() {
    Logger.info("Loading commands...")
    await loadCommands()
    Logger.info("Loading events...")
    await loadEvents()
    await client.login(DISCORD_CONFIG.TOKEN)
}

init()
