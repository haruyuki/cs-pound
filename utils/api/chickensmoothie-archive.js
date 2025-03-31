import { Logger } from "../common/logger.js"
import { ItemDB, PetDB } from "../database/chickensmoothie-db.js"
import { makeGETRequest } from "./webrequests.js"

// List of pet IDs to exclude from database
const EXCEPTIONS = new Set([
    "3B46301A6C8B850D87A730DA365B0960",
    "E5FEFE44A3070BC9FC176503EC1A603F",
    "0C1AFF9AEAA0953F1B1F9B818C2771C9",
    "7C912BA5616D2E24E9F700D90E4BA2B6",
    "905BB7DE4BC4E29D7FD2D1969667B568",
    "773B14EEB416FA762C443D909FFED344",
    "1C0DB4785FC78DF4395263D40261C614",
    "5066110701B0AE95948A158F0B262EBB",
    "5651A6C10C4D375A1901142C49C5C70C",
    "8BED72498D055E55ABCA7AD29B180BF4",
])

/**
 * Fetches event links for a specific year and type (pets or items)
 * @param {number} year - The year to fetch events for
 * @param {string} type - The type of events to fetch ("pets" or "items")
 * @returns {Promise<Array<string>>} Array of event links
 */
export async function fetchEventLinks(year, type) {
    Logger.debug(`Fetching event links for ${type} of year ${year}`)
    const url = `https://www.chickensmoothie.com/archive/${year}/${type === "pets" ? "" : "Items/"}`
    // Use static cache type with longer TTL since archive pages rarely change
    Logger.debug(`Making GET request to ${url}`)
    const $ = await makeGETRequest(url, { use: true, type: "static" })
    const links = $("li.event.active a, li.event a")
        .map((_, el) => $(el).attr("href"))
        .get()
    Logger.debug(`Found ${links.length} event links for ${year}`)
    return links
}

/**
 * Processes a page of pets or items and adds them to the database
 * @param {Object} $ - Cheerio object containing the parsed HTML
 * @param {string} pageLink - The base link to the page
 * @param {string} type - The type of data to process ("pets" or "items")
 * @param {number} year - The year of the data
 * @param {string} eventTitle - The title of the event
 * @param {number} groupIndex - The index of the group to process
 * @returns {Promise<number>} The number of items added to the database
 */
export async function processPage(
    $,
    pageLink,
    type,
    year,
    eventTitle,
    groupIndex = 0,
) {
    Logger.debug(
        `Processing ${type} page: ${eventTitle}, group index: ${groupIndex}`,
    )
    // Create the correct pageLink for database storage
    // This simulates pagination for link storage even though we're using a single request
    const groupsPerPage = type === "pets" ? 7 : 10
    const pageMultiplier = type === "pets" ? 7 : 10

    // Calculate which page this group belongs to (0-indexed)
    // Every 7 groups constitute one page (groups 0-6 = page 0, groups 7-13 = page 1, etc.)
    const pageNumber = Math.floor(groupIndex / groupsPerPage)

    // Calculate the pageStart parameter based on the page number
    // For pets: first page (groups 0-6) has no pageStart, second page (groups 7-13) has pageStart=7, etc.
    // For items: first page (groups 0-6) has no pageStart, second page (groups 7-13) has pageStart=10, etc.
    const storedPageLink =
        pageNumber === 0
            ? pageLink.split("?")[0]
            : `${pageLink.split("?")[0]}?pageStart=${pageNumber * pageMultiplier}`

    Logger.debug(
        `Using stored page link: ${storedPageLink} (page ${pageNumber})`,
    )
    let added = 0

    if (type === "pets") {
        Logger.debug(`Processing pets in group ${groupIndex}`)
        const petLinks = $(
            'img[alt="Pet"]',
            `.archive-pet-tree-container:eq(${groupIndex})`,
        )
            .map((_, el) => $(el).attr("src"))
            .get()

        Logger.debug(
            `Found ${petLinks.length} pet links in group ${groupIndex}`,
        )

        const petIds = [
            ...new Set(
                petLinks.map((link) => {
                    const params = new URLSearchParams(link.split("?")[1])
                    return params.get("k")
                }),
            ),
        ].filter((id) => id && !EXCEPTIONS.has(id))

        Logger.debug(
            `Extracted ${petIds.length} unique pet IDs (after filtering exceptions)`,
        )

        Logger.debug(`Upserting ${petIds.length} pets to database`)
        await Promise.all(
            petIds.map(async (petId) => {
                try {
                    await PetDB.upsert({
                        petID: petId,
                        petYear: year,
                        petEvent: eventTitle,
                        petLink: storedPageLink,
                    })
                    added++
                    Logger.debug(
                        `Successfully added pet ID: ${petId} from ${eventTitle}`,
                    )
                } catch (err) {
                    if (err.name === "SequelizeUniqueConstraintError") {
                        Logger.warn(`Pet ID ${petId} already exists.`)
                    } else {
                        Logger.error(
                            `Error adding pet ID ${petId}: ${err.message}`,
                            err,
                        )
                    }
                }
            }),
        )
        Logger.info(
            `Added ${added} pets from ${eventTitle} (group ${groupIndex})`,
        )
        return added
    }

    if (type === "items") {
        Logger.debug(`Processing items in group ${groupIndex}`)
        const items = $(`.archive-item-group:eq(${groupIndex}) li.item`)
            .map((_, item) => {
                const imageLink = $(item).find("img").attr("src")
                const components = new URL(imageLink)
                const path = components.pathname.slice(6).split("&")
                const name = $(item).find("div").text().trim() || null
                const left = parseInt(path[0])
                const right = parseInt(path[1].match(/\d+/)[0])
                return { name, left, right }
            })
            .get()

        Logger.debug(`Found ${items.length} items in group ${groupIndex}`)

        Logger.debug(`Upserting ${items.length} items to database`)
        await Promise.all(
            items.map(async ({ name, left, right }) => {
                try {
                    await ItemDB.upsert({
                        itemLID: left,
                        itemRID: right,
                        itemName: name,
                        itemYear: year,
                        itemEvent: eventTitle,
                        itemLink: storedPageLink,
                    })
                    added++
                    Logger.debug(
                        `Successfully added item ID: ${left}-${right} (${name}) from ${eventTitle}`,
                    )
                } catch (err) {
                    if (err.name === "SequelizeUniqueConstraintError") {
                        Logger.warn(`Item ID ${left}-${right} already exists.`)
                    } else {
                        Logger.error(
                            `Error adding item ID ${left}-${right}: ${err.message}`,
                            err,
                        )
                    }
                }
            }),
        )
        Logger.info(
            `Added ${added} items from ${eventTitle} (group ${groupIndex})`,
        )
        return added
    }
    return added
}
