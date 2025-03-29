import { ItemDB, PetDB } from "../database/database.js"

// Constants used for identification
const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]

const EXCEPTIONS = [
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
]

/**
 * Formats a reply with details about an identified pet or item
 * @param {string|null} name - The name of the item (null for pets)
 * @param {string} event - The event the entity is from
 * @param {number} year - The year the entity is from
 * @param {string} link - The archive link for the entity
 * @param {boolean} isItem - Whether the entity is an item (true) or pet (false)
 * @returns {string} Formatted reply string
 */
export function formatIdentificationReply(
    name,
    event,
    year,
    link,
    isItem = true,
) {
    const isMonth = MONTHS.includes(event)
    const entityType = isItem ? "item" : "pet"

    const namePart = name ? `'${name}' ` : ""
    const eventPart = isMonth ? `${event} ${year}` : `${year} ${event}`

    return `That ${entityType} is ${namePart}from ${eventPart}!\nArchive Link: ${link}`
}

/**
 * Identifies an item from Chicken Smoothie based on its link
 * @param {string} link - The link to the item
 * @returns {Promise<string>} A formatted response with the item's details or an error message
 */
export async function identifyItem(link) {
    const matches = link.match(/item\/(\d+)(?:&p=(\d+))?\.jpg/)
    const itemLID = matches[1]
    const itemRID = matches[2] || null

    const item = await ItemDB.findOne({
        where: itemRID == null ? { itemLID } : { itemLID, itemRID },
    })

    if (!item) {
        return `There is no data for this item yet :frowning:\nPlease note that current year items don't have data yet. [⠀](${link})`
    }

    return (
        formatIdentificationReply(
            item.get("itemName"),
            item.get("itemEvent"),
            item.get("itemYear"),
            item.get("itemLink"),
        ) + ` [⠀](${link})`
    )
}

/**
 * Identifies a pet from Chicken Smoothie based on its link
 * @param {string} link - The link to the pet
 * @returns {Promise<string>} A formatted response with the pet's details or an error message
 */
export async function identifyPet(link) {
    const url = new URL(link)
    const params = new URLSearchParams(url.search)
    const petID = params.get("k")

    if (EXCEPTIONS.includes(petID)) {
        return `That pet is not identifiable at this growth stage :frowning: [⠀](${link})`
    }

    const pet = await PetDB.findOne({ where: { petID: petID } })

    if (!pet) {
        return `There is no data for this pet yet :frowning:\nPlease note that current year pets don't have data yet. [⠀](${link})`
    }

    return (
        formatIdentificationReply(
            null,
            pet.get("petEvent"),
            pet.get("petYear"),
            pet.get("petLink"),
            false,
        ) + ` [⠀](${link})`
    )
}

/**
 * Validates if a link is a valid Chicken Smoothie link
 * @param {string} link - The link to validate
 * @returns {boolean} True if the link is valid, false otherwise
 */
export function isValidChickenSmoothieLink(link) {
    return (
        link.includes("chickensmoothie.com") || link.includes("chickencdn.com")
    )
}

/**
 * Checks if a pet link contains items (trans)
 * @param {string} link - The link to check
 * @returns {boolean} True if the pet has items, false otherwise
 */
export function hasPetItems(link) {
    return link.includes("trans")
}

/**
 * Checks if a link is an item link
 * @param {string} link - The link to check
 * @returns {boolean} True if the link is an item link, false otherwise
 */
export function isItemLink(link) {
    return link.includes("item")
}

/**
 * Checks if a pet link contains the required parameter
 * @param {string} link - The link to check
 * @returns {boolean} True if the link has the k parameter, false otherwise
 */
export function hasPetParameter(link) {
    return link.includes("k=")
}
