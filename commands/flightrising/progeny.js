import { unlink } from "node:fs"
import fetch from "node-fetch"
import sharp from "sharp"

import { Logger } from "../../logger.js"
import { makeGETRequest, makePOSTRequest } from "../../webrequests.js"
import { ELEMENTS } from "./flightrising.js"

export async function progenyCommand(interaction, dragon1, dragon2, element) {
    interaction.deferReply()
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

const fetchForeseeLinks = async (dragon1, dragon2, count) => {
    const progenyURL = `https://flightrising.com/includes/ol/scryer_progeny.php?id1=${dragon1}&id2=${dragon2}`
    const progenyLinks = []

    // Use concurrency for multiple fetches
    await Promise.all(
        Array.from({ length: count }).map(async () => {
            const $ = await makeGETRequest(progenyURL)
            progenyLinks.push(...getOffspringImages($))
        }),
    )

    return progenyLinks
}

const adjustElementForLinks = (progenyLinks, element) => {
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

const fetchPredictLinks = async (dragonCombinations) => {
    const images = await Promise.all(
        dragonCombinations.map(async (combination) => {
            const payload = new URLSearchParams(combination)
            const url = `https://www1.flightrising.com/scrying/ajax-predict?${payload.toString()}`

            const data = await makePOSTRequest(
                "https://www1.flightrising.com/scrying/ajax-predict",
                payload.toString(),
                false,
                true,
            )
            return "https://flightrising.com" + data.dragon_url
        }),
    )

    return images
}

function getOffspringImages($) {
    const images = []
    $("img").each((_, img) => {
        const src = $(img).attr("src")
        if (src) images.push(src)
    })
    return images
}

async function fetchImage(url) {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    return sharp(arrayBuffer).resize(175, 175).withMetadata(false)
}

async function createImage(imageUrls, imagesPerRow = 8) {
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
            channels: 4, // RGBA
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
