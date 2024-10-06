const { SlashCommandBuilder, EmbedBuilder, version: discordJsVersion } = require('discord.js');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Get some statistics about the bot.'),
    async execute(interaction) {
        const guildCount = interaction.client.guilds.cache.size;
        const commandCount = interaction.client.commands.size;
        const nodeVersion = process.version;
        const uptime = ms(process.uptime() * 1000, { long: true });

        const statsEmbed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle('CS-Pound Stats')
            .addFields(
                { name: 'Guild Count', value: `${guildCount}`, inline: true },
                { name: 'Command Count', value: `${commandCount}`, inline: true },
                { name: 'Node.js Version', value: `${nodeVersion}`, inline: true },
                { name: 'Discord.js Version', value: `${discordJsVersion}`, inline: true },
                { name: 'Uptime', value: `${Math.floor(process.uptime())} = ${uptime}`, inline: true }
            );

        await interaction.reply({ embeds: [statsEmbed] });
    },
};