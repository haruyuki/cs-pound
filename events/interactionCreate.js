import { Events } from "discord.js"

import { Logger } from "../logger.js"

export const name = Events.InteractionCreate

export async function execute(interaction) {
    if (!interaction.isChatInputCommand()) return

    const command = interaction.client.commands.get(interaction.commandName)

    if (!command) {
        Logger.error(
            `No command matching ${interaction.commandName} was found.`,
        )
        return
    }

    try {
        await command.execute(interaction)
    } catch (error) {
        Logger.error(error)
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: "There was an error while executing this command!",
                ephemeral: true,
            })
        } else {
            try {
                await interaction.reply({
                    content: "There was an error while executing this command!",
                    ephemeral: true,
                })
            } catch (error2) {
                Logger.error(error2)
            }
        }
    }
}
