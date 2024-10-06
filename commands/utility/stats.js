const { SlashCommandBuilder, EmbedBuilder, version: discordJsVersion } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Get some statistics about the bot.'),
    async execute(interaction) {
        const guildCount = interaction.client.guilds.cache.size;
        const commandCount = interaction.client.commands.size;
        const nodeVersion = process.version;
        const uptime = process.uptime();

        const formatUptime = (uptime) => {
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            let formattedUptime = '';
            if (days > 0) formattedUptime += `${days}d `;
            if (hours > 0) formattedUptime += `${hours}h `;
            if (minutes > 0) formattedUptime += `${minutes}m `;
            if (seconds > 0) formattedUptime += `${seconds}s`;
            return formattedUptime.trim();
        };

        const statsEmbed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle('CS-Pound Stats')
            .addFields(
                { name: 'Guild Count', value: `${guildCount}`, inline: true },
                { name: 'Command Count', value: `${commandCount}`, inline: true },
                { name: 'Node.js Version', value: `${nodeVersion}`, inline: true },
                { name: 'Discord.js Version', value: `${discordJsVersion}`, inline: true },
                { name: 'Uptime', value: `${formatUptime(uptime)}`, inline: true }
            );

        await interaction.reply({ embeds: [statsEmbed] });
    },
};