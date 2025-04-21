import SlashCommandBuilder from "discord.js"

export const data = new SlashCommandBuilder()
    .setName("poundpets")
    .setDescription("Get the list of pets in the pound. (No longer works)")

export async function execute(interaction) {
    await interaction.reply("Due to changes made to ChickenSmoothie on 20th April 2025 hiding pound pets from view, this command will no longer work for the forseeable future.\nMore information can be found here: https://www.chickensmoothie.com/news/news.php?id=1121")
}
