import { MessageFlags, SlashCommandBuilder } from "discord.js"

import { Logger } from "../../utils/common/logger.js"
import { formatter, parseTimeString } from "../../utils/time/utils.js"

export const data = new SlashCommandBuilder()
    .setName("remindme")
    .setDescription("Pings you after a specified amount of time.")
    .addStringOption((option) =>
        option
            .setName("time")
            .setDescription(
                "The amount of time to wait before reminding you (e.g., 10s, 5m, 1h, 1h5m10s)",
            )
            .setRequired(true),
    )

export async function execute(interaction) {
    try {
        const amount = interaction.options.getString("time")
        const parsedTime = parseTimeString(amount)
        const milliseconds =
            (parsedTime[0] * 60 * 60 + parsedTime[1] * 60 + parsedTime[2]) *
            1000

        if (parsedTime.every((value) => value === 0)) {
            return await interaction.reply({
                content:
                    "Invalid time format. Please provide a valid time format (e.g., 10s, 5m, 1h, 1h5m10s).",
                flags: MessageFlags.Ephemeral,
            })
        }

        const total = formatter(parsedTime)
        await interaction.reply({
            content: `A reminder has been set for you in ${total}.`,
            flags: MessageFlags.Ephemeral,
        })

        setTimeout(async () => {
            try {
                await interaction.channel.send({
                    content: `${interaction.user}, this is your ${amount} reminder!`,
                })
            } catch (error) {
                Logger.error(`Failed to send reminder: ${error}`)
            }
        }, milliseconds)
    } catch (error) {
        Logger.error(`Error in remindme command: ${error}`)
        await interaction.reply({
            content:
                "An error occurred while setting your reminder. Please try again",
            flags: MessageFlags.Ephemeral,
        })
    }
}
