import { authenticate } from "../../utils/lib.js"
import { Logger } from "../../utils/logger.js"

export async function gemsCommand(interaction, amount) {
    const [csExchangeRate, gemExchangeRate, treasureExchangeRate] =
        await getExchangeRates()
    const csAmount = convertCurrency(amount, gemExchangeRate, csExchangeRate)
    const treasureAmount = convertCurrency(amount, 1, treasureExchangeRate)

    await interaction.reply(
        `${amount} gems is equal to approximately:\n${csAmount}C$\n${treasureAmount} treasure\n(Based on the ratio 1C$:${csExchangeRate}g and 1g:${gemExchangeRate}t)`,
    )
}

export async function treasureCommand(interaction, amount) {
    const [csExchangeRate, gemExchangeRate, treasureExchangeRate] =
        await getExchangeRates()
    const gemsAmount = convertCurrency(amount, treasureExchangeRate, 1)
    const csAmount = convertCurrency(
        gemsAmount,
        gemExchangeRate,
        csExchangeRate,
    )

    await interaction.reply(
        `${amount} treasure is equal to approximately:\n${csAmount}C$\n${gemsAmount} gems\n(Based on the ratio 1C$:${csExchangeRate}g and 1g:${gemExchangeRate}t)`,
    )
}

export async function csCommand(interaction, amount) {
    const [csExchangeRate, gemExchangeRate, treasureExchangeRate] =
        await getExchangeRates()
    const gemsAmount = convertCurrency(amount, csExchangeRate, gemExchangeRate)
    const treasureAmount = convertCurrency(gemsAmount, 1, treasureExchangeRate)

    await interaction.reply(
        `${amount}C$ is equal to approximately:\n${gemsAmount} gems\n${treasureAmount} treasure\n(Based on the ratio 1C$:${csExchangeRate}g and 1g:${gemExchangeRate}t)`,
    )
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
