import { SlashCommandBuilder } from "discord.js"
import { MongoClient } from "mongodb"

const client = new MongoClient(process.env.MONGODB_URI)
const database = client.db("cs_pound")
const collection = database.collection("auto_remind")

export const data = new SlashCommandBuilder()
    .setName("autoremind")
    .setDescription("Set or cancel auto reminders for the pound and laf")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("set")
            .setDescription("Set auto reminders for the pound and laf")
            .addStringOption((option) =>
                option
                    .setName("type")
                    .setDescription("The type of auto remind to set")
                    .setRequired(true)
                    .addChoices(
                        { name: "Pound", value: "pound" },
                        { name: "Lost and Found", value: "laf" },
                    ),
            )
            .addNumberOption((option) =>
                option
                    .setName("minutes")
                    .setDescription(
                        "The number of minutes to remind you before the opening",
                    )
                    .setRequired(true)
                    .setMinValue(1)
                    .setMaxValue(60),
            ),
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("remove")
            .setDescription("Cancel auto reminds for the pound and laf")
            .addStringOption((option) =>
                option
                    .setName("type")
                    .setDescription("The type of auto remind to cancel")
                    .setRequired(true)
                    .addChoices(
                        { name: "Pound", value: "pound" },
                        { name: "Lost and Found", value: "laf" },
                    ),
            ),
    )

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    if (subcommand === "set") {
        await interaction.deferReply()
        const reminderType = interaction.options.getString("type")
        const minutes = interaction.options.getNumber("minutes")
        const documentExists = await collection.findOne({
            user_id: interaction.user.id.toString(),
        })

        if (documentExists) {
            await collection.updateOne(
                { user_id: interaction.user.id.toString() },
                {
                    $set: {
                        [reminderType]: minutes,
                        channel_id: interaction.channelId.toString(),
                        server_id: interaction.guildId.toString(),
                    },
                },
            )
            await interaction.editReply(
                `Your ${reminderType === "pound" ? "Pound" : "Lost and Found"} auto remind has been updated to ${minutes} minute(s) in channel <#${interaction.channelId}>.`,
            )
            return
        }

        await collection.insertOne({
            server_id: interaction.guildId.toString(),
            channel_id: interaction.channelId.toString(),
            user_id: interaction.user.id.toString(),
            pound: reminderType === "pound" ? minutes : 0,
            laf: reminderType === "laf" ? minutes : 0,
        })

        await interaction.editReply(
            `Your ${reminderType === "pound" ? "Pound" : "Lost and Found"} auto remind has been set to ${minutes} minute(s) in channel <#${interaction.channelId}>.`,
        )
    }

    if (subcommand === "remove") {
        const reminderType = interaction.options.getString("type")
        const result = await collection.findOneAndUpdate(
            { user_id: interaction.user.id.toString() },
            { $set: { [reminderType]: 0 } },
            { returnDocument: "before" },
        )
        const remind_time = result[reminderType]

        if (remind_time === 0) {
            await interaction.reply(
                `No reminder was found. Are you sure you have an Auto Remind set up?`,
                { ephemeral: true },
            )
            return
        }

        await interaction.reply(
            `Your ${remind_time} minute(s) reminder for the ${reminderType === "pound" ? "Pound" : "Lost and Found"} has been removed.`,
        )
    }
}
