const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('support')
        .setDescription('Sends you a link to the CS-Pound Dev Server.'),
    async execute(interaction) {
        await interaction.reply({ content: 'Need help with the bot? Come join the support server here! https://support.haruyuki.moe/', ephemeral: true });
    },
};