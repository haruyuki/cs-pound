import { performance } from "node:perf_hooks"

import { CS_CONFIG } from "../config.js"
import { Logger } from "./logger.js"
import { makeGETRequest } from "./webrequests.js"
import { login } from "./auth.js"

const RARE_RARITIES = ["Rare", "Very rare", "Extremely rare", "OMG so rare!"]

// Function to get the opening time for Pound or Lost and Found
export const getOpeningTime = async () => {
    try {
        const startTime = performance.now()

        const cacheOptions = { use: false, type: "short" }

        // Make the request to the URL using axiosClient and the existing cookie jar
        const $ = await makeGETRequest(CS_CONFIG.URLS.POUND_LAF, cacheOptions)

        // Extract the last <h2> element's text content
        const text = $("h2:last-of-type").text().trim()

        // Check if the text refers to The Pound or Lost and Found
        const isPound = text === "The Pound"
        const isLostAndFound = text === "The Lost and Found"

        if (isPound || isLostAndFound) {
            // Select the corresponding remaining count based on the section (Pound or Lost and Found)
            const remainingSelector = isPound
                ? "#pets_remaining"
                : "#items_remaining"
            const thingsRemaining = parseNumber($(remainingSelector).text())

            const endTime = performance.now()
            Logger.debug(
                `getOpeningTime (open): ${Math.round(endTime - startTime)}ms`,
            )

            return {
                openingType: isPound ? "pound" : "lost and found",
                timeRemaining: 0,
                thingsRemaining,
            }
        }

        // Check for opening time using regex
        const match = text.match(
            /(pound|lost and found).*?(?:in:|within)\s*(?:(\d+)\s*hours?)?\s*(?:,?\s*(\d+)\s*minutes?)?/i,
        )

        if (match) {
            const [, openingType, hours, minutes] = match

            // Convert to minutes, defaulting undefined values to 0
            const timeInMinutes =
                (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0)

            return {
                openingType: openingType.toLowerCase(),
                timeRemaining: timeInMinutes,
                thingsRemaining: 0,
            }
        }

        // Return null if no match found
        return null
    } catch (error) {
        console.error("Error while getting opening time:", error.message)
        return null
    }
}

// Function to get rare pets from the pound
export const getRarePoundPets = async () => {
    // Log in and check if successful
    await login()

    try {
        // Fetch the pound page HTML using axiosClient
        const $ = await makeGETRequest(CS_CONFIG.URLS.POUND_GROUP)
        const allPets = []

        // Loop through all pets and extract rare pets
        $("dl.pet").each((_, petElement) => {
            const petRarity = $(petElement).find(".pet-rarity img").attr("alt")

            // Only process if the pet rarity matches the desired rare categories
            if (RARE_RARITIES.includes(petRarity)) {
                const petAdoption = $(petElement)
                    .find(".pet-adoption-date")
                    .text()
                    .trim()

                const petImage = new URL(
                    $(petElement).find("dt a img").attr("src"),
                )
                petImage.searchParams.set("bg", "e0f6b2")

                // Push the pet details into the array
                allPets.push([petImage.toString(), petAdoption, petRarity])
            }
        })

        return allPets
    } catch (error) {
        Logger.error("Error fetching rare pound pets:", error.message)
        return []
    }
}

// Utility function to parse numbers safely
const parseNumber = (text) => {
    const match = text.match(/\d+/)
    return match ? parseInt(match[0]) : 0
}