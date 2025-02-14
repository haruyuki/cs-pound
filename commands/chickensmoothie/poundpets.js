import { existsSync, unlink } from "node:fs"
import { AttachmentBuilder, SlashCommandBuilder } from "discord.js"
import fetch from "node-fetch"
import sharp from "sharp"

import { getOpeningTime, getRarePoundPets } from "../../lib.js"
import { Logger } from "../../logger.js"

if (existsSync("rares.png")) {
    unlink("rares.png", (err) => {
        if (err) Logger.error("Startup cleanup failed for rares.png:", err)
        else Logger.info("Cleaned up old rares.png")
    })
}

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
        const rarePets = await getRarePoundPets()

        const rares = await generateImage(rarePets, "rares.png")

        if (!rares) {
            await interaction.editReply(
                "Error generating images. Please contact the developer.",
            )
            return
        }

        imageGenerated = true
        await interaction.editReply({
            files: [
                new AttachmentBuilder("./rares.png", { name: "rares.png" }),
            ],
        })

        // Schedule deletion
        const deletionTime = (openingDetails.timeRemaining + 10) * 60000
        Logger.info(`Scheduled deletion in ${deletionTime / 60000} minutes.`)
        setTimeout(() => {
            ;[rares].forEach((file) => {
                unlink(file, (err) => {
                    if (err) Logger.error(`Failed to delete ${file}:`, err)
                    else Logger.info(`Deleted ${file}`)
                })
            })
            imageGenerated = false
            imageGenerating = false
        }, deletionTime)
    } catch (error) {
        Logger.error("Command execution failed:", error)
        await interaction.editReply(
            "An unexpected error occurred. Please try again later.",
        )
        imageGenerating = false
    }
}

async function fetchImage(url) {
    try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const buffer = await response.arrayBuffer()
        return sharp(buffer)
    } catch (error) {
        Logger.error(`Image fetch failed: ${url} - ${error.message}`)
        return null
    }
}

async function generateImage(pets, filename) {
    const BG_COLOUR = { r: 224, g: 246, b: 178, alpha: 1 }
    const tempFiles = []

    try {
        const petImages = []
        for (const [petImagePath, adoptionDate, rarity] of pets) {
            try {
                const petImage = await fetchImage(petImagePath)
                if (!petImage) continue

                // Get image metadata
                const metadata = await petImage.metadata()
                const petWidth = Math.max(metadata.width, 111)
                const petHeight = metadata.height

                // Create centered components
                const [dateText, rarityBadge] = await Promise.all([
                    createTextImage(adoptionDate, petWidth),
                    createRarityBadge(rarity, petWidth),
                ])

                // Create temporary stacked image
                const tempPath = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.png`
                await sharp({
                    create: {
                        width: petWidth,
                        height: petHeight + 46,
                        channels: 4,
                        background: BG_COLOUR,
                    },
                })
                    .composite([
                        // Center pet image horizontally
                        {
                            input: await petImage.toBuffer(),
                            left: Math.floor((petWidth - metadata.width) / 2),
                            top: 0,
                        },
                        // Date text (centered via SVG)
                        {
                            input: dateText,
                            top: petHeight,
                            left: 0,
                        },
                        // Centered rarity badge
                        {
                            input: rarityBadge,
                            top: petHeight + 16,
                            left: 0,
                        },
                    ])
                    .toFile(tempPath)

                petImages.push(tempPath)
                tempFiles.push(tempPath)
                petImage.destroy()
            } catch (error) {
                Logger.error(
                    `Pet processing failed: ${petImagePath} - ${error.message}`,
                )
            }
        }

        return petImages.length > 0
            ? await compositeRows(petImages, filename, BG_COLOUR)
            : null
    } finally {
        // Cleanup temp files
        tempFiles.forEach((file) => {
            unlink(file, (err) => {
                if (err) Logger.error(`Temp cleanup failed: ${file}`, err)
            })
        })
    }
}

async function createTextImage(text, width) {
    return sharp(
        Buffer.from(
            `<svg width="${width}" height="16">
            <text x="50%" y="12" font-family="Verdana" font-size="12" 
                  text-anchor="middle" fill="black">${text}</text>
        </svg>`,
        ),
    )
        .png()
        .toBuffer()
}

async function createRarityBadge(rarity, containerWidth) {
    const rarityRegions = {
        Rare: { top: 210, height: 30 },
        "Very rare": { top: 240, height: 30 },
        "Extremely rare": { top: 270, height: 30 },
        "OMG so rare!": { top: 300, height: 30 },
    }

    const region = rarityRegions[rarity]
    if (!region) throw new Error(`Unknown rarity: ${rarity}`)

    // Extract badge from source image
    const badge = await sharp("./starbars-light.png")
        .extract({ left: 0, width: 111, ...region })
        .toBuffer()

    // Center badge in container
    return sharp({
        create: {
            width: containerWidth,
            height: 30,
            channels: 4,
            background: { r: 224, g: 246, b: 178, alpha: 1 },
        },
    })
        .composite([
            {
                input: badge,
                left: Math.floor((containerWidth - 111) / 2),
                top: 0,
            },
        ])
        .png()
        .toBuffer()
}

async function compositeRows(imagePaths, filename, bgColor) {
    const MAX_ROW_WIDTH = 1920
    const rows = []
    let currentRow = { width: 0, height: 0, images: [] }

    for (const path of imagePaths) {
        const { width, height } = await sharp(path).metadata()
        const newWidth = currentRow.width + width

        if (newWidth > MAX_ROW_WIDTH && currentRow.images.length > 0) {
            rows.push(currentRow)
            currentRow = { width: 0, height: 0, images: [] }
        }

        currentRow.images.push({ path, width, height })
        currentRow.width += width
        currentRow.height = Math.max(currentRow.height, height)
    }
    if (currentRow.images.length > 0) rows.push(currentRow)

    let yPos = 0
    const composites = []
    for (const row of rows) {
        let xPos = 0
        for (const img of row.images) {
            composites.push({
                input: img.path,
                left: xPos,
                top: yPos + (row.height - img.height),
            })
            xPos += img.width
        }
        yPos += row.height
    }

    return sharp({
        create: {
            width: MAX_ROW_WIDTH,
            height: yPos,
            channels: 4,
            background: bgColor,
        },
    })
        .composite(composites)
        .png()
        .toFile(filename)
        .then(() => filename)
        .catch((error) => {
            Logger.error(`Final composition failed: ${error.message}`)
            return null
        })
}
