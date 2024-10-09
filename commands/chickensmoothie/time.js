import { EmbedBuilder, SlashCommandBuilder } from "discord.js"

import { getPoundTime } from "../../lib.js"

export const data = new SlashCommandBuilder()
    .setName("time")
    .setDescription("Tells you how long until the pound/lost & found opens.")

export async function execute(interaction) {
    const text = await getPoundTime()

    if (text === "The Pound") {
        await interaction.reply(
            "Pound is currently open! [Go adopt a pet from the Pound!](https://www.chickensmoothie.com/poundandlostandfound.php)",
        )
        return
    }

    if (text === "The Lost and Found") {
        await interaction.reply(
            "Lost and Found is currently open! [Go adopt a pet from the Lost and Found!](https://www.chickensmoothie.com/poundandlostandfound.php)",
        )
        return
    }

    const timeEmbed = new EmbedBuilder()
        .setColor(0x4ba139)
        .setURL("https://www.chickensmoothie.com/poundandlostandfound.php")
        .setDescription(text)
    if (text.includes("Pound")) {
        timeEmbed.setTitle("Pound")
    } else if (text.includes("Lost and Found")) {
        timeEmbed.setTitle("Lost and Found")
    } else {
        timeEmbed.setTitle("Error")
        timeEmbed.setColor(0xff0000)
    }
    await interaction.reply({ embeds: [timeEmbed] })
}
