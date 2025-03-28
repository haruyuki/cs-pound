import { readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { REST, Routes } from "discord.js"
import dotenv from "dotenv"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"

import { Logger } from "./logger.js"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
    .option("global", {
        alias: "g",
        description: "Deploy commands globally",
        type: "boolean",
        default: false,
    })
    .option("guild", {
        alias: "s",
        description: "Deploy commands to a specific guild",
        type: "string",
    })
    .option("delete", {
        alias: "d",
        description: "Delete a command by ID",
        type: "string",
    })
    .option("env", {
        alias: "e",
        description: "Environment to deploy to (dev or prod)",
        type: "string",
        choices: ["dev", "prod"],
        default: "prod",
    })
    .option("token", {
        alias: "t",
        description: "Token environment variable to use (overrides env option)",
        type: "string",
    })
    .option("clientId", {
        alias: "c",
        description:
            "Client ID environment variable to use (overrides env option)",
        type: "string",
    })
    .help()
    .alias("help", "h")
    .parse()

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

    let tokenVar = argv.token
    let clientIdVar = argv.clientId

    // If token and clientId are not explicitly provided, use the env option
    if (!tokenVar && !clientIdVar) {
        if (argv.env === "dev") {
            tokenVar = "DISCORD_TOKEN_DEV"
            clientIdVar = "CLIENT_ID_DEV"
        } else {
            // prod is the default
            tokenVar = "DISCORD_TOKEN"
            clientIdVar = "CLIENT_ID"
        }
    } else {
        // If only one is provided, set the other based on environment
        if (!tokenVar) {
            tokenVar =
                argv.env === "dev" ? "DISCORD_TOKEN_DEV" : "DISCORD_TOKEN"
        }
        if (!clientIdVar) {
            clientIdVar = argv.env === "dev" ? "CLIENT_ID_DEV" : "CLIENT_ID"
        }
    }

    Logger.info(`Using environment: ${argv.env}`)
    Logger.info(`Using token variable: ${tokenVar}`)
    Logger.info(`Using client ID variable: ${clientIdVar}`)

    const rest = new REST().setToken(process.env[tokenVar])

    try {
        Logger.info(`Started refreshing ${commands.length} slash commands.`)

        // Handle command deletion if specified
        if (argv.delete) {
            const commandID = argv.delete
            if (argv.global) {
                await rest.delete(
                    Routes.applicationCommand(
                        process.env[clientIdVar],
                        commandID,
                    ),
                )
                Logger.success("Successfully deleted global command")
            } else {
                const guildId = argv.guild || process.env.GUILD_ID
                await rest.delete(
                    Routes.applicationGuildCommand(
                        process.env[clientIdVar],
                        guildId,
                        commandID,
                    ),
                )
                Logger.success(
                    `Successfully deleted guild command from guild ${guildId}`,
                )
            }
            return
        }

        // Handle command deployment
        let data
        if (argv.global) {
            // Global commands
            data = await rest.put(
                Routes.applicationCommands(process.env[clientIdVar]),
                { body: commands },
            )
            Logger.success(
                `Successfully reloaded ${data.length} global slash commands.`,
            )
        } else {
            // Guild commands
            const guildId = argv.guild || process.env.GUILD_ID
            data = await rest.put(
                Routes.applicationGuildCommands(
                    process.env[clientIdVar],
                    guildId,
                ),
                { body: commands },
            )
            Logger.success(
                `Successfully reloaded ${data.length} slash commands to guild ${guildId}.`,
            )
        }
    } catch (error) {
        Logger.warn(error)
    }
}

loadCommands()
