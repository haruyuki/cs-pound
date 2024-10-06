const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const puppeteer = require('rebrowser-puppeteer');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('time')
        .setDescription('Tells you how long until the pound/lost & found opens.'),
    async execute(interaction) {
        const browser = await puppeteer.launch({ userDataDir: './chrome_data' });
        const page = await browser.newPage();
        await page.setRequestInterception(true)
        page.on('request', (request) => {
            if (request.resourceType() === 'image') request.abort()
            else request.continue()
        })
        await page.goto('https://www.chickensmoothie.com/poundandlostandfound.php', { waitUntil: 'domcontentloaded' });
        const element = await page.$('h2:last-of-type');
        let text = (await element.evaluate(el => el.textContent)).trim();
        const correction = {
            "Sorry, the pound is closed at the moment.": "",
            "Sorry, the Lost and Found is closed at the moment.": "",
            "\n": "",
            "\t": "",
        }
        const reg = new RegExp(Object.keys(correction).join("|"), "g");
        text = text.replace(reg, (matched) => correction[matched]);
        const timeEmbed = new EmbedBuilder()
            .setColor(0x4BA139)
            .setURL('https://www.chickensmoothie.com/poundandlostandfound.php')
            .setDescription(text)
        if (text.includes('Pound')) {
            timeEmbed.setTitle('Pound');
        } else if (text.includes('Lost and Found')) {
            timeEmbed.setTitle('Lost and Found');
        } else {
            timeEmbed.setTitle('Error');
            timeEmbed.setColor(0xFF0000);
        }
        await interaction.reply({ embeds: [timeEmbed] });
        await browser.close();
    },
}
