import { readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { REST, Routes } from "discord.js"
import dotenv from "dotenv"

import { Logger } from "./logger.js"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const commands = []
const foldersPath = join(__dirname, "commands")
const commandFolders = readdirSync(foldersPath)

async function loadCommands() {
    for (const folder of commandFolders) {
        const commandsPath = join(foldersPath, folder)
        const commandFiles = readdirSync(commandsPath).filter((file) =>
            file.endsWith(".js"),
        )
        for (const file of commandFiles) {
            const filePath = pathToFileURL(join(commandsPath, file))
            const command = await import(filePath)
            if ("data" in command && "execute" in command) {
                commands.push(command.data.toJSON())
            } else {
                Logger.warn(
                    `The command at ${filePath} is missing a required "data" or "execute" property.`,
                )
            }
        }
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN)

    try {
        Logger.info(`Started refreshing ${commands.length} slash commands.`)

        const data = await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID,
            ),
            // Routes.applicationCommands(clientID),
            { body: commands },
        )

        Logger.success(`Successfully reloaded ${data.length} slash commands.`)
    } catch (error) {
        Logger.warn(error)
    }
}

loadCommands()

// for guild-based commands
// rest.delete(Routes.applicationGuildCommand(clientID, guildID, commandID))
//     .then(() => console.log('Successfully deleted guild command'))
//     .catch(console.error);

// for global commands
// rest.delete(Routes.applicationCommand(clientID, commandID))
//     .then(() => console.log('Successfully deleted application command'))
//     .catch(console.error);
