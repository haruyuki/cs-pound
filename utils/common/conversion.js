import { convertCurrency, getExchangeRates } from "../api/flightrising.js"

/**
 * Handles the gems conversion command
 * @param {Object} interaction - Discord interaction object
 * @param {number} amount - Amount of gems to convert
 * @returns {Promise<void>}
 */
export async function handleGemsConversion(interaction, amount) {
    const [csExchangeRate, gemExchangeRate, treasureExchangeRate] =
        await getExchangeRates()
    const csAmount = convertCurrency(amount, gemExchangeRate, csExchangeRate)
    const treasureAmount = convertCurrency(amount, 1, treasureExchangeRate)

    await interaction.reply(
        `${amount} gems is equal to approximately:\n${csAmount}C$\n${treasureAmount} treasure\n(Based on the ratio 1C$:${csExchangeRate}g and 1g:${gemExchangeRate}t)`,
    )
}

/**
 * Handles the treasure conversion command
 * @param {Object} interaction - Discord interaction object
 * @param {number} amount - Amount of treasure to convert
 * @returns {Promise<void>}
 */
export async function handleTreasureConversion(interaction, amount) {
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

/**
 * Handles the CS conversion command
 * @param {Object} interaction - Discord interaction object
 * @param {number} amount - Amount of CS to convert
 * @returns {Promise<void>}
 */
export async function handleCSConversion(interaction, amount) {
    const [csExchangeRate, gemExchangeRate, treasureExchangeRate] =
        await getExchangeRates()
    const gemsAmount = convertCurrency(amount, csExchangeRate, gemExchangeRate)
    const treasureAmount = convertCurrency(gemsAmount, 1, treasureExchangeRate)

    await interaction.reply(
        `${amount}C$ is equal to approximately:\n${gemsAmount} gems\n${treasureAmount} treasure\n(Based on the ratio 1C$:${csExchangeRate}g and 1g:${gemExchangeRate}t)`,
    )
}
