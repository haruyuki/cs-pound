import { unlink } from "node:fs"
import fetch from "node-fetch"
import sharp from "sharp"

import { Logger } from "../common/logger.js"
import { ELEMENTS } from "./flightrising.js"
import { makeGETRequest, makePOSTRequest } from "./webrequests.js"

/**
 * Fetches links to potential offspring dragons using the foresee endpoint
 * @param {number} dragon1 - ID of the first dragon
 * @param {number} dragon2 - ID of the second dragon
 * @param {number} count - Number of offspring to generate
 * @returns {Promise<Array>} Array of image URLs
 */
export const fetchForeseeLinks = async (dragon1, dragon2, count) => {
    const progenyURL = `https://flightrising.com/includes/ol/scryer_progeny.php?id1=${dragon1}&id2=${dragon2}`
    const progenyLinks = []

    // Configure cache options - don't cache these requests as they should be unique each time
    const cacheOptions = { use: false }

    // Use concurrency for multiple fetches
    await Promise.all(
        Array.from({ length: count }).map(async () => {
            const $ = await makeGETRequest(progenyURL, cacheOptions)
            progenyLinks.push(...getOffspringImages($))
        }),
    )

    return progenyLinks
}

/**
 * Adjusts the element for dragon links
 * @param {Array} progenyLinks - Array of dragon image URLs
 * @param {number} element - Element ID to set
 * @returns {Array} Array of parameter objects for the predict endpoint
 */
export const adjustElementForLinks = (progenyLinks, element) => {
    return progenyLinks.map((link) => {
        const parsedUrl = new URL(link)
        parsedUrl.searchParams.delete("auth")
        parsedUrl.searchParams.delete("dummyext")
        parsedUrl.searchParams.set("element", element)
        parsedUrl.searchParams.set("age", 0)
        parsedUrl.searchParams.append("_token", process.env.FLIGHTRISING_TOKEN)
        return Object.fromEntries(parsedUrl.searchParams.entries())
    })
}

/**
 * Fetches predict links for dragon combinations
 * @param {Array} dragonCombinations - Array of parameter objects
 * @returns {Promise<Array>} Array of dragon image URLs
 */
export const fetchPredictLinks = async (dragonCombinations) => {
    return Promise.all(
        dragonCombinations.map(async (combination) => {
            const payload = new URLSearchParams(combination)

            // Configure cache options - don't cache these POST requests as they contain unique data
            const cacheOptions = { use: false }

            const data = await makePOSTRequest(
                "https://www1.flightrising.com/scrying/ajax-predict",
                payload.toString(),
                false,
                true,
                cacheOptions,
            )
            return "https://flightrising.com" + data.dragon_url
        }),
    )
}

/**
 * Extracts image URLs from the HTML response
 * @param {Object} $ - Cheerio object
 * @returns {Array} Array of image URLs
 */
export function getOffspringImages($) {
    const images = []
    $("img").each((_, img) => {
        const src = $(img).attr("src")
        if (src) images.push(src)
    })
    return images
}

/**
 * Fetches and processes an image
 * @param {string} url - Image URL
 * @returns {Promise<Object>} Sharp image object
 */
export async function fetchImage(url) {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    return sharp(arrayBuffer).resize(175, 175).withMetadata(false)
}

/**
 * Creates a composite image from multiple dragon images
 * @param {Array} imageUrls - Array of image URLs
 * @param {number} imagesPerRow - Number of images per row
 * @returns {Promise<string>} Filename of the created image
 */
export async function createImage(imageUrls, imagesPerRow = 8) {
    const imageSize = 175
    const rowCount = Math.ceil(imageUrls.length / imagesPerRow)

    // Fetch all images in parallel and keep them as sharp instances
    const images = await Promise.all(imageUrls.map(fetchImage))
    const buffers = await Promise.all(images.map((image) => image.toBuffer()))

    // Create a blank canvas for the grid
    const gridWidth = imagesPerRow * imageSize
    const gridHeight = rowCount * imageSize
    const canvas = sharp({
        create: {
            width: gridWidth,
            height: gridHeight,
            channels: 4,
            background: { r: 222, g: 218, b: 207, alpha: 1 },
        },
    })

    // Prepare composites (positioning each image on the canvas)
    const composites = buffers.map((buffer, index) => {
        const x = (index % imagesPerRow) * imageSize
        const y = Math.floor(index / imagesPerRow) * imageSize
        return {
            input: buffer,
            top: y,
            left: x,
        }
    })

    // Composite all images onto the canvas
    const filename = `progeny${Date.now()}.png`
    await canvas
        .composite(await Promise.all(composites))
        .png()
        .toFile(filename)
    return filename
}

/**
 * Handles the progeny command logic
 * @param {Object} interaction - Discord interaction object
 * @param {number} dragon1 - ID of the first dragon
 * @param {number} dragon2 - ID of the second dragon
 * @param {number} element - Element ID
 * @returns {Promise<void>}
 */
export async function handleProgeny(interaction, dragon1, dragon2, element) {
    let filename

    if (element === null || element === 7) {
        const images = await fetchForeseeLinks(dragon1, dragon2, 10)
        filename = await createImage(images, 8)
    } else {
        const progenyLinks = await fetchForeseeLinks(dragon1, dragon2, 5)

        const dragonCombinations = adjustElementForLinks(progenyLinks, element)

        const images = await fetchPredictLinks(dragonCombinations)

        filename = await createImage(images, 4)
    }

    const dragon1Link = `https://www1.flightrising.com/dragon/${dragon1}`
    const dragon2Link = `https://www1.flightrising.com/dragon/${dragon2}`

    await interaction.editReply({
        content: `Progeny results of [${dragon1}](${dragon1Link}) and [${dragon2}](${dragon2Link}) with ${element ? Object.keys(ELEMENTS).find((key) => ELEMENTS[key] === element) : "shadow"} element`,
        files: [{ attachment: filename, name: "progeny.png" }],
    })
    unlink(filename, (err) => {
        if (err) Logger.error(`Error deleting file: ${err}`)
    })
}
