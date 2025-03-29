import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js"

import { Logger } from "../../utils/logger.js"

export const data = new SlashCommandBuilder()
    .setName("debug")
    .setDescription("Control debug mode for the bot.")
    .addBooleanOption((option) =>
        option
            .setName("enable")
            .setDescription("Set debug mode")
            .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export async function execute(interaction) {
    const state = interaction.options.getBoolean("enable")

    // If state is provided, set debug mode accordingly
    if (state) {
        Logger.enableDebug()
    } else {
        Logger.disableDebug()
    }

    // Reply with the current debug mode status
    await interaction.reply({
        content: `Debug mode is now ${state ? "enabled" : "disabled"}.`,
        ephemeral: true,
    })
}
