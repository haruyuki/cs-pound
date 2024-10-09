import { SlashCommandBuilder } from "discord.js"

function formatter([h, m, s]) {
    return [
        h ? `${h} hour${h > 1 ? "s" : ""}${m || s ? ", " : ""}` : "",
        m ? `${m} minute${m > 1 ? "s" : ""}${s ? " and " : ""}` : "",
        s ? `${h || m ? "and " : ""}${s} second${s > 1 ? "s" : ""}` : "",
    ].join("")
}

function parseTimeString(amount) {
    const times = { h: 0, m: 0, s: 0 }

    if (/^\d+$/.test(amount)) {
        times.m = parseInt(amount, 10)
    } else {
        if (!/^\d+[hms](\d+[hms])*$/.test(amount)) {
            return [0, 0, 0]
        }

        const matches = amount.match(/(\d+)([hms])/g) || []

        matches.forEach((match) => {
            const value = parseInt(match.slice(0, -1), 10)
            const unit = match.slice(-1)
            times[unit] = value
        })
    }

    if (times.s >= 60) {
        times.m += Math.floor(times.s / 60)
        times.s = times.s % 60
    }

    if (times.m >= 60) {
        times.h += Math.floor(times.m / 60)
        times.m = times.m % 60
    }

    return [times.h, times.m, times.s]
}

export const data = new SlashCommandBuilder()
    .setName("remindme")
    .setDescription("Pings you after a specified amount of time.")
    .addStringOption((option) =>
        option
            .setName("time")
            .setDescription(
                "The amount of time to wait before reminding you (e.g., 10s, 5m, 1h, 1h5m10s)",
            )
            .setRequired(true),
    )

export async function execute(interaction) {
    const amount = interaction.options.getString("time")
    const data = parseTimeString(amount)
    const milliseconds = (data[0] * 60 * 60 + data[1] * 60 + data[2]) * 1000
    if (data.every((value) => value === 0)) {
        return await interaction.reply({
            content:
                "Invalid time format. Please provide a valid time format (e.g., 10s, 5m, 1h, 1h5m10s).",
            ephemeral: true,
        })
    }

    const total = formatter(data)
    await interaction.reply({
        content: `A reminder has been set for you in ${total}.`,
        ephemeral: true,
    })

    setTimeout(() => {
        interaction.followUp({
            content: `${interaction.user}, this is your ${amount} reminder!`,
        })
    }, milliseconds)
}
