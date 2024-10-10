import { readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { Client, Collection, GatewayIntentBits } from "discord.js"
import dotenv from "dotenv"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

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
            const command = await import(filePath) // Dynamic import inside async function
            if ("data" in command && "execute" in command) {
                client.commands.set(command.data.name, command)
                console.log(
                    `Command ${command.data.name} loaded from ${filePath}.`,
                )
            } else {
                console.error(
                    `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
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
        const event = await import(filePath) // Dynamic import inside async function
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args))
        } else {
            client.on(event.name, (...args) => event.execute(...args))
        }
        console.log(`Event ${event.name} loaded from ${filePath}.`)
    }
}

// Login and initialization
async function init() {
    await loadCommands()
    await loadEvents()
    await client.login(process.env.DISCORD_TOKEN)
}

init() // Start the async functions
