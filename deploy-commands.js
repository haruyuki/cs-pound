import { readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { REST, Routes } from "discord.js"
import dotenv from "dotenv"

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
                console.log(
                    `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
                )
            }
        }
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN)

    try {
        console.log(
            `Started refreshing ${commands.length} application (/) commands.`,
        )

        const data = await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID,
            ),
            // Routes.applicationCommands(clientID),
            { body: commands },
        )

        console.log(
            `Successfully reloaded ${data.length} application (/) commands.`,
        )
    } catch (error) {
        console.error(error)
    }
}

loadCommands().then(() => console.log("Commands deployed!"))

// for guild-based commands
// rest.delete(Routes.applicationGuildCommand(clientID, guildID, commandID))
//     .then(() => console.log('Successfully deleted guild command'))
//     .catch(console.error);

// for global commands
// rest.delete(Routes.applicationCommand(clientID, commandID))
//     .then(() => console.log('Successfully deleted application command'))
//     .catch(console.error);
