import { existsSync, unlink } from "node:fs"
import { AttachmentBuilder, SlashCommandBuilder } from "discord.js"
import fetch from "node-fetch"
import sharp from "sharp"

import { getOpeningTime, getRarePoundPets } from "../../lib.js"
import { Logger } from "../../logger.js"

let imageGenerated = existsSync("rares.png") && existsSync("raresPlus.png")
let imageGenerating = false

export const data = new SlashCommandBuilder()
    .setName("poundpets")
    .setDescription("Get the list of pets in the pound.")

export async function execute(interaction) {
    if (imageGenerated) {
        await interaction.deferReply()
        await interaction.editReply({
            files: [
                new AttachmentBuilder("./raresPlus.png", {
                    name: "raresPlus.png",
                }),
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
    if (openingDetails.openingType === "The Lost and Found") {
        await interaction.reply("The next opening is not the Pound!")
        imageGenerating = false
        return
    } else if (openingDetails.openingType === "The Pound") {
        await interaction.reply(
            "An image cannot be generated while the pound is still open!",
        )
        imageGenerating = false
        return
    }

    await interaction.deferReply()

    Logger.debug("Fetching rare pets from the pound")
    const rarePets = await getRarePoundPets()

    const rares = await generateImage(
        rarePets.filter((pet) => pet[2] === "Rare"),
        "rares.png",
    )
    const raresPlus = await generateImage(
        rarePets.filter((pet) => pet[2] !== "Rare"),
        "raresPlus.png",
    )

    if (rares == null || raresPlus == null) {
        await interaction.editReply(
            "There was an error generating the image. Please contact the developer.",
        )
        imageGenerating = false
        return
    }

    const raresImage = new AttachmentBuilder(`./${rares}`, { name: "rares.png" })
    const raresPlusImage = new AttachmentBuilder(`./${raresPlus}`, {
        name: "raresPlus.png",
    })
    imageGenerated = true

    interaction.editReply({ files: [raresPlusImage, raresImage] })

    Logger.debug(
        `Deleting image after: ${openingDetails.timeRemaining + 90} minutes`,
    )
    setTimeout(
        async () => {
            try {
                // Delete the first file if it exists
                unlink(rares, (err) => {
                    if (err) {
                        Logger.error(err)
                    } else Logger.info(`${rares} was deleted`)
                })
                Logger.info(`${rares} was deleted`)

                // Delete the second file if it exists
                unlink(raresPlus, (err) => {
                    if (err) {
                        Logger.error(err)
                    } else Logger.info(`${raresPlus} was deleted`)
                })
                Logger.info(`${raresPlus} was deleted`)
            } catch (error) {
                Logger.error("Error deleting files:", error)
            }
            imageGenerated = false
            imageGenerating = false
        },
        (openingDetails.timeRemaining + 90) * 60000,
    )
}

async function fetchImage(url) {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    return sharp(arrayBuffer) // Convert arrayBuffer to sharp
}

async function generateImage(pets, filename) {
    Logger.debug(`Generating image: ${filename}`)
    const maxRowWidth = 1920
    const columnImages = []
    const BG_COLOUR = { r: 224, g: 246, b: 178, alpha: 1 }

    for (let [petImagePath, adoptionDate, rarity] of pets) {
        try {
            // Load pet image and get its metadata
            const petImageData = await fetchImage(petImagePath)
            const petImageMetadata = await petImageData.metadata()
            const petImage = await petImageData.toBuffer()
            const petImageWidth =
                petImageMetadata.width < 111 ? 111 : petImageMetadata.width
            const petImageWidthDiff = Math.floor(
                (petImageWidth - petImageMetadata.width) / 2,
            )
            const petImageHeight = petImageMetadata.height

            if (!petImage) {
                Logger.error(`Failed to load pet image from ${petImagePath}`)
                return null
            }

            // Create text buffer for adoption date
            const adoptionDateBuffer = await sharp({
                create: {
                    width: petImageWidth, // match the pet image width
                    height: 16,
                    channels: 4,
                    background: BG_COLOUR, // RGBA for background color
                },
            })
                .composite([
                    {
                        input: Buffer.from(
                            `<svg width="${petImageWidth}" height="16"><text x="50%" y="12" font-size="12" text-anchor="middle" font-family="Verdana" fill="black">${adoptionDate}</text></svg>`,
                        ),
                        top: 0,
                        left: 0,
                    },
                ])
                .png()
                .toBuffer()

            if (!adoptionDateBuffer) {
                Logger.error(
                    `Failed to create text buffer for adoption date: ${adoptionDate}`,
                )
                return null
            }

            // Extract the correct region from the atlas image based on rarity
            let rarityImage
            const rarityRegion = {
                Rare: { top: 210, left: 0, width: 111, height: 30 },
                "Very rare": { top: 240, left: 0, width: 111, height: 30 },
                "Extremely rare": { top: 270, left: 0, width: 111, height: 30 },
                "OMG so rare!": { top: 300, left: 0, width: 111, height: 30 },
            }

            if (rarityRegion[rarity]) {
                rarityImage = await sharp("./starbars-light.png")
                    .extract(rarityRegion[rarity])
                    .png()
                    .toBuffer()
            } else {
                Logger.error(`Unknown rarity: ${rarity}`)
                return null
            }

            // Ensure rarity image matches the pet image width by adding transparent padding
            const paddedRarityImage = await sharp({
                create: {
                    width: petImageWidth, // Match the pet image width
                    height: 30, // Fixed height for rarity image
                    channels: 4,
                    background: BG_COLOUR, // RGBA for background color
                },
            })
                .composite([
                    {
                        input: rarityImage,
                        left: Math.floor((petImageWidth - 111) / 2),
                        top: 0,
                    },
                ]) // Center rarity image
                .png()
                .toBuffer()

            // Stack the pet image, adoption date, and rarity image vertically
            const stackedImage = await sharp({
                create: {
                    width: petImageWidth, // Pet image width
                    height: petImageHeight + 16 + 30, // Pet image height + adoption date + rarity image
                    channels: 4,
                    background: BG_COLOUR, // RGBA for background color
                },
            })
                .composite([
                    { input: petImage, top: 0, left: petImageWidthDiff }, // Pet image at the top
                    { input: adoptionDateBuffer, top: petImageHeight, left: 0 }, // Adoption date below pet image
                    {
                        input: paddedRarityImage,
                        top: petImageHeight + 16,
                        left: 0,
                    }, // Rarity image below the adoption date
                ])
                .png()
                .toBuffer()

            columnImages.push(stackedImage) // Push each stacked image to the column array
        } catch (error) {
            Logger.error(`Error processing entry: ${error.message}`)
        }
    }

    if (columnImages.length === 0) {
        Logger.error("No valid images were processed.")
        return null
    }

    let totalWidth = 0
    let currentRowHeight = 0
    let compositeImages = []
    let rowImages = []

    // Loop through the images to create rows
    for (const img of columnImages) {
        const { width, height } = await sharp(img).metadata()

        // If adding this image exceeds the max width, start a new row
        if (totalWidth + width > maxRowWidth) {
            compositeImages.push({ row: rowImages, height: currentRowHeight })
            rowImages = []
            totalWidth = 0
            currentRowHeight = 0
        }

        // Add image to the current row
        rowImages.push({ input: img, top: 0, left: totalWidth, height: height })
        totalWidth += width
        currentRowHeight = Math.max(currentRowHeight, height)
    }

    // Push the last row into the composite image
    if (rowImages.length > 0) {
        compositeImages.push({ row: rowImages, height: currentRowHeight })
    }

    // Calculate the total height and width of the final image
    const finalWidth = maxRowWidth
    const finalHeight = compositeImages.reduce(
        (sum, { height }) => sum + height,
        0,
    )

    // Composite rows vertically
    let currentTop = 0
    const compositeFinalImage = []

    for (const { row, height } of compositeImages) {
        row.forEach((image) => {
            compositeFinalImage.push({
                input: image.input,
                left: image.left,
                top: currentTop + (height - image.height),
            })
        })
        currentTop += height
    }

    // Create the final image
    await sharp({
        create: {
            width: finalWidth,
            height: finalHeight,
            channels: 4,
            background: BG_COLOUR, // Match the background color used elsewhere
        },
    })
        .composite(compositeFinalImage)
        .png()
        .toFile(filename)

    Logger.success(`Image saved to ${filename}`)
    return filename
}
