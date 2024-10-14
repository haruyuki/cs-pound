import { SlashCommandBuilder } from "discord.js"

import { getOpeningTime } from "../../lib.js"

export const data = new SlashCommandBuilder()
    .setName("time")
    .setDescription("Tells you how long until the pound/lost & found opens.")

export async function execute(interaction) {
    const openingTime = await getOpeningTime()

    if (openingTime === null) {
        await interaction.reply(
            "Sorry, both the Pound and Lost and Found are closed at the moment.",
        )
        return
    }

    const openingType =
        openingTime.openingType === "pound" ? "Pound" : "Lost and Found"

    if (openingTime.timeRemaining === 0) {
        await interaction.reply(
            `The ${openingType} is currently open with ${openingTime.thingsRemaining} ${openingType === "Pound" ? "pets" : "items"} remaining! [Go adopt a pet from the ${openingType}!](https://www.chickensmoothie.com/poundandlostandfound.php)`,
        )
        return
    }

    const hours = Math.floor(openingTime.timeRemaining / 60)
    const minutes = openingTime.timeRemaining % 60

    let result = ""

    if (hours > 0) {
        result += `The ${openingType} will open ${hours > 1 ? "within" : "in:"} ${hours} ${hours > 1 ? "hours" : "hour"}`
    }

    if (minutes > 0) {
        // If there are hours, format the minutes accordingly
        if (hours > 0) {
            result += `, ${minutes} ${minutes > 1 ? "minutes" : "minute"}.`
        } else {
            result += `The ${openingType} will open in: ${minutes} ${minutes > 1 ? "minutes" : "minute"}.`
        }
    } else {
        result += "."
    }

    await interaction.reply(result.trim())
}
