import { writeFileSync } from "node:fs"
import { performance } from "node:perf_hooks"
import { Solver } from "@2captcha/captcha-solver"
import dotenv from "dotenv"
import { google } from "googleapis"
import { MongoClient } from "mongodb"
import Sequelize, { NUMBER, STRING } from "sequelize"

import {
    CAPTCHA_CONFIG,
    COOKIE_FILE_PATH,
    CS_CONFIG,
    DATABASE_CONFIG,
} from "../config.js"
import { Logger } from "./logger.js"
import { cookieJar, makeGETRequest, makePOSTRequest } from "./webrequests.js"

dotenv.config()

export let POUND_REMIND_TIMES = []
export let LAF_REMIND_TIMES = []
const RARE_RARITIES = ["Rare", "Very rare", "Extremely rare", "OMG so rare!"]

const solver = new Solver(CAPTCHA_CONFIG.API_KEY)

// Configure MongoDB with connection pooling
const client = new MongoClient(DATABASE_CONFIG.MONGODB.URI, {
    maxPoolSize: DATABASE_CONFIG.MONGODB.CONNECTION_POOL.MAX_POOL_SIZE,
    minPoolSize: DATABASE_CONFIG.MONGODB.CONNECTION_POOL.MIN_POOL_SIZE,
    maxIdleTimeMS: DATABASE_CONFIG.MONGODB.CONNECTION_POOL.MAX_IDLE_TIME_MS,
    connectTimeoutMS:
        DATABASE_CONFIG.MONGODB.CONNECTION_POOL.CONNECT_TIMEOUT_MS,
    socketTimeoutMS: DATABASE_CONFIG.MONGODB.CONNECTION_POOL.SOCKET_TIMEOUT_MS,
})

// Initialize MongoDB connection
let database
let collection

// Connect to MongoDB asynchronously
async function connectToMongoDB() {
    try {
        const startTime = performance.now()
        await client.connect()
        database = client.db(DATABASE_CONFIG.MONGODB.DB_NAME)
        collection = database.collection(
            DATABASE_CONFIG.MONGODB.COLLECTIONS.AUTO_REMIND,
        )
        const endTime = performance.now()
        Logger.success(
            `Connected to MongoDB (${Math.round(endTime - startTime)}ms)`,
        )
        return true
    } catch (error) {
        Logger.error(`MongoDB connection error: ${error.message}`)
        return false
    }
}

// Initialize connection
connectToMongoDB()

// Function to save the cookies to a file
function saveCookiesToFile(jar, filepath) {
    const serializedCookies = JSON.stringify(jar.serializeSync())
    writeFileSync(filepath, serializedCookies, "utf-8")
}

export const sequelize = new Sequelize({
    dialect: "sqlite",
    logging: false,
    storage: DATABASE_CONFIG.SQLITE.FILENAME,
    // Performance optimizations
    pool: DATABASE_CONFIG.SQLITE.POOL,
    // Disable automatic pluralization of table names
    define: {
        freezeTableName: true,
        timestamps: false,
    },
    // Enable query caching
    dialectOptions: {
        // SQLite specific options
        pragma: {
            cache_size: DATABASE_CONFIG.SQLITE.PRAGMA.CACHE_SIZE,
            journal_mode: DATABASE_CONFIG.SQLITE.PRAGMA.JOURNAL_MODE,
            synchronous: DATABASE_CONFIG.SQLITE.PRAGMA.SYNCHRONOUS,
        },
    },
})

export const PetDB = sequelize.define(
    "ChickenSmoothiePetArchive",
    {
        petID: {
            type: STRING,
            unique: true,
            primaryKey: true,
        },
        petYear: NUMBER,
        petEvent: STRING,
        petLink: STRING,
    },
    {
        freezeTableName: true,
        timestamps: false,
    },
)

export const ItemDB = sequelize.define(
    "ChickenSmoothieItemArchive",
    {
        itemLID: {
            type: STRING,
            unique: true,
            primaryKey: true,
        },
        itemRID: {
            type: STRING,
            unique: true,
        },
        itemName: STRING,
        itemYear: NUMBER,
        itemEvent: STRING,
        itemLink: STRING,
    },
    {
        freezeTableName: true,
        timestamps: false,
    },
)
// Function to attempt login without CAPTCHA
const attemptLogin = async (captchaSolution = null) => {
    try {
        const $ = await makeGETRequest(CS_CONFIG.URLS.LOGIN)

        const csrfToken = $('input[name="csrf_token"]').val()
        const payload = new URLSearchParams()
        payload.append("username", CS_CONFIG.USERNAME)
        payload.append("password", CS_CONFIG.PASSWORD)
        payload.append("autologin", "on")
        payload.append("login", "Login")

        if (csrfToken) {
            payload.append("csrf_token", csrfToken)
        }

        if (captchaSolution) {
            payload.append("g-recaptcha-response", captchaSolution)
        }

        const postLoginContent = await makePOSTRequest(
            CS_CONFIG.URLS.LOGIN,
            payload.toString(),
            true,
            false,
        )
        const postLogoutText = postLoginContent("li.icon-logout a").text()

        if (postLogoutText.includes("Logout")) {
            Logger.success("Logged in successfully!")
            return { success: true, html: postLoginContent }
        } else {
            Logger.warn("Login failed, CAPTCHA may be required.")
            return { success: false, html: postLoginContent }
        }
    } catch (error) {
        Logger.error("Error during login:" + error)
        return { success: false, html: null }
    }
}

// Function to check for CAPTCHA and retry login if present
export const login = async () => {
    try {
        // Step 1: Attempt to log in without CAPTCHA
        const { success, $ } = await attemptLogin()

        if (success) {
            saveCookiesToFile(cookieJar, COOKIE_FILE_PATH)
            return
        }

        // Step 2: Use the HTML from the failed login to check for CAPTCHA
        Logger.debug("Attempting login again with reCAPTCHA...")

        // Check for reCAPTCHA site key
        const siteKey = $("div.g-recaptcha").attr("data-sitekey")
        if (!siteKey) {
            Logger.error("No reCAPTCHA found, but login still failed.")
        }

        Logger.debug(`Found reCAPTCHA site key: ${siteKey}`)

        // Step 3: Solve the reCAPTCHA
        const captchaSolution = await solver.recaptcha({
            googlekey: siteKey,
            pageurl: CS_CONFIG.URLS.LOGIN,
        })

        if (!captchaSolution || !captchaSolution.data) {
            Logger.error("Failed to solve reCAPTCHA")
        }

        Logger.success(`reCAPTCHA solved successfully: ${captchaSolution.data}`)

        // Step 4: Retry login with the solved CAPTCHA
        const retryLoginResult = await attemptLogin(captchaSolution.data)

        if (retryLoginResult.success) {
            Logger.success("Logged in successfully with CAPTCHA.")
            saveCookiesToFile(cookieJar, COOKIE_FILE_PATH)
        } else {
            Logger.warn("Login failed even after solving reCAPTCHA.")
        }
    } catch (error) {
        Logger.error("Error solving reCAPTCHA and logging in:" + error)
    }
}

export const updateAutoRemindTimes = async () => {
    try {
        const startTime = performance.now()

        // Ensure we have a valid MongoDB connection
        if (!client.db) {
            Logger.warn("MongoDB connection lost, attempting to reconnect...")
            await connectToMongoDB()
        }

        // Execute both queries in parallel for better performance
        const [poundTimes, lafTimes] = await Promise.all([
            collection.distinct("pound"),
            collection.distinct("laf"),
        ])

        // Update the global variables
        POUND_REMIND_TIMES = poundTimes
        LAF_REMIND_TIMES = lafTimes

        const endTime = performance.now()
        Logger.debug(
            `Updated auto-remind times (${Math.round(endTime - startTime)}ms)`,
        )
    } catch (error) {
        Logger.error(`Error updating auto-remind times: ${error.message}`)
        // Return default values in case of error
        POUND_REMIND_TIMES = []
        LAF_REMIND_TIMES = []
    }
}

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

// Utility function to parse numbers safely
const parseNumber = (text) => {
    const match = text.match(/\d+/)
    return match ? parseInt(match[0]) : 0
}

export function formatter([h, m, s]) {
    return [
        h ? `${h} hour${h > 1 ? "s" : ""}${m || s ? ", " : ""}` : "",
        m ? `${m} minute${m > 1 ? "s" : ""}${s ? " and " : ""}` : "",
        s ? `${h || m ? "and " : ""}${s} second${s > 1 ? "s" : ""}` : "",
    ].join("")
}

export const authenticate = () => {
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    const auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    )
    return google.sheets({ version: "v4", auth })
}

export const getAutoRemindDocuments = async (time, openingType) => {
    try {
        const startTime = performance.now()

        // Ensure we have a valid MongoDB connection
        if (!client.db) {
            Logger.warn("MongoDB connection lost, attempting to reconnect...")
            await connectToMongoDB()
        }

        // Create a more efficient query with proper indexing
        let query
        if (openingType === "pound") {
            query = { pound: time }
        } else if (openingType === "lost and found") {
            query = { laf: time }
        } else {
            return []
        }

        // Only retrieve the fields we need to reduce data transfer
        const projection = { user_id: 1, channel_id: 1, _id: 0 }

        // Execute the query with the projection
        const results = await collection
            .find(query)
            .project(projection)
            .toArray()

        const endTime = performance.now()
        Logger.debug(
            `Retrieved ${results.length} auto-remind documents for ${openingType}:${time} (${Math.round(endTime - startTime)}ms)`,
        )

        return results
    } catch (error) {
        Logger.error(`Error retrieving auto-remind documents: ${error.message}`)
        return []
    }
}

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
