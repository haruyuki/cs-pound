import { existsSync, unlink } from "node:fs"
import fetch from "node-fetch"
import sharp from "sharp"

import { Logger } from "./logger.js"

/**
 * Fetches an image from a URL and returns a Sharp instance
 * @param {string} url - The URL of the image to fetch
 * @returns {Promise<sharp.Sharp|null>} A Sharp instance or null if the fetch failed
 */
async function fetchImage(url) {
    const response = await fetch(url)
    if (!response.ok) return null
    const buffer = await response.arrayBuffer()
    return sharp(buffer)
}

/**
 * Generates an image of rare pets from the pound
 * @param {Array} pets - Array of pet data [petImagePath, adoptionDate, rarity]
 * @param {string} filename - The filename to save the image as
 * @returns {Promise<string|null>} The filename if successful, null otherwise
 */
export async function generatePetImage(pets, filename) {
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

/**
 * Creates an SVG text image with the given text centered
 * @param {string} text - The text to display
 * @param {number} width - The width of the image
 * @returns {Promise<Buffer>} A buffer containing the PNG image
 */
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

/**
 * Creates a rarity badge image
 * @param {string} rarity - The rarity level
 * @param {number} containerWidth - The width of the container
 * @returns {Promise<Buffer>} A buffer containing the PNG image
 */
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

/**
 * Composes multiple images into rows
 * @param {string[]} imagePaths - Array of paths to images
 * @param {string} filename - The filename to save the composite image as
 * @param {Object} bgColor - The background color
 * @returns {Promise<string|null>} The filename if successful, null otherwise
 */
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

/**
 * Schedules the deletion of image files after a specified time
 * @param {string} filename - The filename to delete
 * @param {number} timeRemaining - Time remaining in minutes
 * @param {Function} onComplete - Callback function to execute after deletion
 */
export function scheduleImageDeletion(filename, timeRemaining, onComplete) {
    // Add 10 minutes to the time remaining
    const deletionTime = (timeRemaining + 10) * 60000
    Logger.info(`Scheduled deletion in ${deletionTime / 60000} minutes.`)

    setTimeout(() => {
        unlink(filename, (err) => {
            if (err) Logger.error(`Failed to delete ${filename}:`, err)
            else Logger.info(`Deleted ${filename}`)
        })

        if (onComplete) onComplete()
    }, deletionTime)
}

/**
 * Cleans up any existing image files on startup
 * @param {string} filename - The filename to clean up
 */
export function cleanupExistingImage(filename) {
    if (existsSync(filename)) {
        unlink(filename, (err) => {
            if (err) {
                Logger.error(`Startup cleanup failed for ${filename}:`, err)
            } else {
                Logger.info(`Cleaned up old ${filename}`)
            }
        })
    }
}
