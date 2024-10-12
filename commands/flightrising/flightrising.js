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
    const [csExchangeRate, gemExchangeRate, treasureExchangeRate] =
        await getExchangeRates()
    const amount = interaction.options.getNumber("amount")

    if (subcommand === "gems") {
        const cs = convertCurrency(amount, gemExchangeRate, csExchangeRate)
        const treasure = convertCurrency(
            amount,
            1,
            treasureExchangeRate,
        )

        interaction.reply(
            `${amount} gems is equal to approximately:\n${cs}C$\n${treasure} treasure\n(Based on the ratio 1C$:${csExchangeRate}g and 1g:${gemExchangeRate}t)`,
        )
    }

    if (subcommand === "treasure") {
        const gems = convertCurrency(
            amount,
            treasureExchangeRate,
            1,
        )
        const cs = convertCurrency(gems, gemExchangeRate, csExchangeRate)

        interaction.reply(
            `${amount} treasure is equal to approximately:\n${cs}C$\n${gems} gems\n(Based on the ratio 1C$:${csExchangeRate}g and 1g:${gemExchangeRate}t)`,
        )
    }

    if (subcommand === "cs") {
        const gems = convertCurrency(amount, csExchangeRate, gemExchangeRate)
        const treasure = convertCurrency(
            gems,
            1,
            treasureExchangeRate,
        )

        interaction.reply(
            `${amount}C$ is equal to approximately:\n${gems} gems\n${treasure} treasure\n(Based on the ratio 1C$:${csExchangeRate}g and 1g:${gemExchangeRate}t)`,
        )
    }
}

const getExchangeRates = async () => {
    const sheets = authenticate()
    const spreadsheetId = "1fmcwLdExvnPRME64Ylzpx1o0bA8qUeqX8HwyQzz1hGc"
    const csExchangeRateCell = "INTRODUCTION (MUST READ)!E10"
    const gemExchangeRateCell = "INTRODUCTION (MUST READ)!F10"
    const treasureExchangeRateCell = "INTRODUCTION (MUST READ)!G10"
    let csExchangeRate
    let gemExchangeRate
    let treasureExchangeRate

    try {
        const csResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: csExchangeRateCell,
        })

        csExchangeRate = Number(csResponse.data.values[0][0])

        const gemResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: gemExchangeRateCell,
        })

        gemExchangeRate = Number(gemResponse.data.values[0][0])

        const treasureResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: treasureExchangeRateCell,
        })

        treasureExchangeRate = Number(treasureResponse.data.values[0][0])
    } catch (err) {
        Logger.error("Error reading the Google Sheet:", err)
    }
    return [csExchangeRate, gemExchangeRate, treasureExchangeRate]
}

const convertCurrency = (amount, fromRate, toRate) => {
    const result = (amount / fromRate) * toRate
    return parseFloat(result.toFixed(2))
}
