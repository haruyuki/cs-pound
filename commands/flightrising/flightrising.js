import { SlashCommandBuilder } from "discord.js"

import { csCommand, gemsCommand, treasureCommand } from "./conversion.js"
import { progenyCommand } from "./progeny.js"

export const ELEMENTS = {
    earth: 1,
    plague: 2,
    wind: 3,
    water: 4,
    lightning: 5,
    ice: 6,
    shadow: 7,
    light: 8,
    arcane: 9,
    nature: 10,
    fire: 11,
}

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

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand()
    const amount = interaction.options.getNumber("amount")

    const subcommandHandlers = {
        gems: () => gemsCommand(interaction, amount),
        treasure: () => treasureCommand(interaction, amount),
        cs: () => csCommand(interaction, amount),
        progeny: async () => {
            const dragon1 = interaction.options.getNumber("dragon1")
            const dragon2 = interaction.options.getNumber("dragon2")
            const element = interaction.options.getNumber("element")
            await progenyCommand(interaction, dragon1, dragon2, element)
        },
    }

    if (subcommandHandlers[subcommand]) {
        await subcommandHandlers[subcommand]()
    }
}
