import {Events} from 'discord.js';
import {PetDB, ItemDB, sequelize} from "../lib.js";

export const name = Events.ClientReady;
export const once = true;

export async function execute(client) {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database.', error);
    }
    await PetDB.sync();
    console.log("Synced PetDB");

    await ItemDB.sync()
    console.log("Synced ItemDB");

    console.log(`Ready! Logged in as ${client.user.tag}`);
}
