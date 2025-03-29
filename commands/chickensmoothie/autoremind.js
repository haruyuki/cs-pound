import { MessageFlags, SlashCommandBuilder } from "discord.js"

import {
    removeAutoReminder,
    setAutoReminder,
} from "../../utils/api/autoremind.js"

export const data = new SlashCommandBuilder()
    .setName("autoremind")
    .setDescription("Set or cancel auto reminders for the pound and laf")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("set")
            .setDescription("Set auto reminders for the pound and laf")
            .addStringOption((option) =>
                option
                    .setName("type")
                    .setDescription("The type of auto remind to set")
                    .setRequired(true)
                    .addChoices(
                        { name: "Pound", value: "pound" },
                        { name: "Lost and Found", value: "laf" },
                    ),
            )
            .addNumberOption((option) =>
                option
                    .setName("minutes")
                    .setDescription(
                        "The number of minutes to remind you before the opening",
                    )
                    .setRequired(true)
                    .setMinValue(1)
                    .setMaxValue(60),
            ),
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("remove")
            .setDescription("Cancel auto reminds for the pound and laf")
            .addStringOption((option) =>
                option
                    .setName("type")
                    .setDescription("The type of auto remind to cancel")
                    .setRequired(true)
                    .addChoices(
                        { name: "Pound", value: "pound" },
                        { name: "Lost and Found", value: "laf" },
                    ),
            ),
    )

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    if (subcommand === "set") {
        await interaction.deferReply()
        const reminderType = interaction.options.getString("type")
        const minutes = interaction.options.getNumber("minutes")

        const success = await setAutoReminder(
            interaction.user.id.toString(),
            interaction.channelId.toString(),
            interaction.guildId.toString(),
            reminderType,
            minutes,
        )

        if (success) {
            await interaction.editReply(
                `Your ${reminderType === "pound" ? "Pound" : "Lost and Found"} auto remind has been set to ${minutes} minute(s) in channel <#${interaction.channelId}>.`,
            )
        } else {
            await interaction.editReply(
                "There was an error setting your auto reminder. Please try again later.",
            )
        }
    }

    if (subcommand === "remove") {
        const reminderType = interaction.options.getString("type")
        const result = await removeAutoReminder(
            interaction.user.id.toString(),
            reminderType,
        )

        if (!result.success || result.previousTime === 0) {
            await interaction.reply({
                content:
                    "No reminder was found. Are you sure you have an Auto Remind set up?",
                flags: MessageFlags.Ephemeral,
            })
            return
        }

        await interaction.reply(
            `Your ${result.previousTime} minute(s) reminder for the ${reminderType === "pound" ? "Pound" : "Lost and Found"} has been removed.`,
        )
    }
}
