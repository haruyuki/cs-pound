import { SlashCommandBuilder } from "discord.js"

import { ELEMENTS } from "../../utils/api/flightrising.js"
import {
    handleCSConversion,
    handleGemsConversion,
    handleTreasureConversion,
} from "../../utils/common/conversion.js"
import { handleProgeny } from "../../utils/api/progeny.js"

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
    .addSubcommand((subcommand) =>
        subcommand
            .setName("progeny")
            .setDescription("See the offspring of two dragon IDs.")
            .addNumberOption((option) =>
                option
                    .setName("dragon1")
                    .setDescription("The ID of the first dragon.")
                    .setRequired(true),
            )
            .addNumberOption((option) =>
                option
                    .setName("dragon2")
                    .setDescription("The ID of the second dragon.")
                    .setRequired(true),
            )
            .addNumberOption((option) =>
                option
                    .setName("element")
                    .setDescription("The element of the offspring.")
                    .setRequired(false)
                    .addChoices(
                        Object.entries(ELEMENTS).map(([name, value]) => ({
                            name,
                            value,
                        })),
                    ),
            ),
    )

// Command handlers have been moved to utility files

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand()
    const amount = interaction.options.getNumber("amount")

    const subcommandHandlers = {
        gems: async () => await handleGemsConversion(interaction, amount),
        treasure: async () =>
            await handleTreasureConversion(interaction, amount),
        cs: async () => await handleCSConversion(interaction, amount),
        progeny: async () => {
            await interaction.deferReply()
            const dragon1 = interaction.options.getNumber("dragon1")
            const dragon2 = interaction.options.getNumber("dragon2")
            const element = interaction.options.getNumber("element")
            await handleProgeny(interaction, dragon1, dragon2, element)
        },
    }

    if (subcommandHandlers[subcommand]) {
        await subcommandHandlers[subcommand]()
    }
}
