const { Events } = require('discord.js');
const {PetDB,  ItemDB, sequelize} = require("../lib.js");

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        try {
            await sequelize.authenticate();
            console.log('Connection has been established successfully.');
        } catch (error) {
            console.error('Unable to connect to the database.', error);
        }
        PetDB.sync().then(() => console.log("Synced PetDB"));
        ItemDB.sync().then(() => console.log("Synced ItemDB"));
        console.log(`Ready! Logged in as ${client.user.tag}`);
    },
};
