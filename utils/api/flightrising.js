import { Logger } from "../common/logger.js"
import { authenticate } from "./auth.js"

/**
 * Flight Rising elements mapping
 */
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

/**
 * Fetches the current exchange rates from the Flight Rising Google Sheet
 * @returns {Promise<Array>} Array containing [csExchangeRate, gemExchangeRate, treasureExchangeRate]
 */
export const getExchangeRates = async () => {
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

/**
 * Converts currency based on exchange rates
 * @param {number} amount - The amount to convert
 * @param {number} fromRate - The rate to convert from
 * @param {number} toRate - The rate to convert to
 * @returns {number} The converted amount
 */
export const convertCurrency = (amount, fromRate, toRate) => {
    const result = (amount / fromRate) * toRate
    return parseFloat(result.toFixed(2))
}
