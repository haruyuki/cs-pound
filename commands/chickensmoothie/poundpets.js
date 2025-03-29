import { AttachmentBuilder, SlashCommandBuilder } from "discord.js"

import {
    getOpeningTime,
    getRarePoundPets,
} from "../../utils/chickensmoothie.js"
import { Logger } from "../../utils/logger.js"
import {
    cleanupExistingImage,
    generatePetImage,
    scheduleImageDeletion,
} from "../../utils/petimage.js"

// Clean up any existing image files on startup
cleanupExistingImage("rares.png")

let imageGenerated = false
let imageGenerating = false

export const data = new SlashCommandBuilder()
    .setName("poundpets")
    .setDescription("Get the list of pets in the pound.")

export async function execute(interaction) {
    if (imageGenerated) {
        await interaction.deferReply()
        await interaction.editReply({
            files: [
                new AttachmentBuilder("./rares.png", { name: "rares.png" }),
            ],
        })
        return
    }
    if (imageGenerating) {
        await interaction.reply(
            "Another user already ran this command!\nPlease try again in a minute.",
        )
        return
    }

    imageGenerating = true

    const openingDetails = await getOpeningTime()
    if (openingDetails.openingType === "lost and found") {
        await interaction.reply("The next opening is not the Pound!")
        imageGenerating = false
        return
    } else if (
        openingDetails.openingType === "pound" &&
        openingDetails.timeRemaining === 0
    ) {
        await interaction.reply(
            "An image cannot be generated while the pound is still open!",
        )
        imageGenerating = false
        return
    }

    await interaction.deferReply()

    try {
        Logger.debug("Fetching rare pets from the pound")
        // Get rare pets from the pound using the updated function
        const rarePets = await getRarePoundPets()

        const rares = await generatePetImage(rarePets, "rares.png")

        if (!rares) {
            await interaction.editReply(
                "Error generating images. Please contact the developer.",
            )
            imageGenerating = false
            return
        }

        imageGenerated = true
        await interaction.editReply({
            files: [
                new AttachmentBuilder("./rares.png", { name: "rares.png" }),
            ],
        })

        // Schedule deletion of the image file
        scheduleImageDeletion("rares.png", openingDetails.timeRemaining, () => {
            imageGenerated = false
            imageGenerating = false
        })
    } catch (error) {
        Logger.error("Command execution failed:", error)
        await interaction.editReply(
            "An unexpected error occurred. Please try again later.",
        )
        imageGenerating = false
    }
}

// Image generation functions have been moved to utils/petimage.js
