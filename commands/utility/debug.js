import {
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js"

import { Logger } from "../../utils/common/logger.js"

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

    if (state) {
        Logger.enableDebug()
    } else {
        Logger.disableDebug()
    }

    await interaction.reply({
        content: `Debug mode is now ${state ? "enabled" : "disabled"}.`,
        flags: MessageFlags.Ephemeral,
    })
}
