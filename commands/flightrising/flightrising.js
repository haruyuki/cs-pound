import { SlashCommandBuilder } from "discord.js"

import { authenticate } from "../../lib.js"
import { Logger } from "../../logger.js"

export const data = new SlashCommandBuilder()
    .setName("flightrising")
    .setDescription("Commands related to Flight Rising.")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("gems")
            .setDescription("Get the conversion rates for gems.")
            .addNumberOption((option) =>
                option
                    .setName("amount")
                    .setDescription("The amount of gems to convert.")
                    .setRequired(true),
            ),
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("treasure")
            .setDescription("Get the conversion rates for treasure.")
            .addNumberOption((option) =>
                option
                    .setName("amount")
                    .setDescription("The amount of treasure to convert.")
                    .setRequired(true),
            ),
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("cs")
            .setDescription("Get the conversion rates for C$.")
            .addNumberOption((option) =>
                option
                    .setName("amount")
                    .setDescription("The amount of C$ to convert.")
                    .setRequired(true),
            ),
    )

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand()
    const amount = interaction.options.getNumber("amount")

    if (subcommand === "gems") {
        await gemsCommand(interaction, amount)
    }

    if (subcommand === "treasure") {
        await treasureCommand(interaction, amount)
    }

    if (subcommand === "cs") {
        await csCommand(interaction, amount)
    }
}
