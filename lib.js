import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { Solver } from "@2captcha/captcha-solver"
import axios from "axios"
import { wrapper } from "axios-cookiejar-support"
import * as cheerio from "cheerio"
import dotenv from "dotenv"
import { google } from "googleapis"
import { MongoClient } from "mongodb"
import Sequelize, { NUMBER, STRING } from "sequelize"
import { CookieJar } from "tough-cookie"

import { Logger } from "./logger.js"

dotenv.config()

export const BOT_VERSION = "2024.10.20"
const COOKIE_FILE_PATH = "./cookies.json"
const CS_USERNAME = process.env.CS_USERNAME
const CS_PASSWORD = process.env.CS_PASSWORD
export const HEADERS = {
    "User-Agent": "CS Pound Discord Bot Agent " + BOT_VERSION,
    From: "haru@haruyuki.moe",
}
export let POUND_REMIND_TIMES = []
export let LAF_REMIND_TIMES = []
const POUND_URL =
    "https://www.chickensmoothie.com/accounts/viewgroup.php?userid=2887&groupid=5813&pageSize=3000"
const RARE_RARITIES = ["Rare", "Very rare", "Extremely rare", "OMG so rare!"]

const solver = new Solver(process.env.CAPTCHA_API_KEY)
const client = new MongoClient(process.env.MONGODB_URI)
const database = client.db("cs_pound")
const collection = database.collection("auto_remind")

const cookieJar = loadCookiesFromFile(COOKIE_FILE_PATH)
const axiosClient = wrapper(
    axios.create({
        jar: cookieJar,
        withCredentials: true,
        headers: HEADERS,
    }),
)

// Function to load cookies from a file
function loadCookiesFromFile(filepath) {
    Logger.debug("Loading cookies from file...")
    if (existsSync(filepath)) {
        const serializedCookies = readFileSync(filepath, "utf-8")
        return CookieJar.deserializeSync(JSON.parse(serializedCookies))
    }
    Logger.warn("No cookies found in file, creating a new cookie jar.")
    return new CookieJar()
}

// Function to save the cookies to a file
function saveCookiesToFile(jar, filepath) {
    const serializedCookies = JSON.stringify(jar.serializeSync())
    writeFileSync(filepath, serializedCookies, "utf-8")
}

export const sequelize = new Sequelize({
    dialect: "sqlite",
    logging: false,
    storage: "chickensmoothie.db",
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
        const loginPageUrl =
            "https://www.chickensmoothie.com/Forum/ucp.php?mode=login"
        const loginPageResponse = await axiosClient.get(loginPageUrl)
        const $ = cheerio.load(loginPageResponse.data)

        const csrfToken = $('input[name="csrf_token"]').val()
        const payload = new URLSearchParams()
        payload.append("username", CS_USERNAME)
        payload.append("password", CS_PASSWORD)
        payload.append("autologin", "on")
        payload.append("login", "Login")

        if (csrfToken) {
            payload.append("csrf_token", csrfToken)
        }

        if (captchaSolution) {
            payload.append("g-recaptcha-response", captchaSolution)
        }

        const loginUrl =
            "https://www.chickensmoothie.com/Forum/ucp.php?mode=login"
        const loginResponse = await axiosClient.post(
            loginUrl,
            payload.toString(),
            {
                headers: {
                    ...HEADERS,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                withCredentials: true,
            },
        )

        const postLoginContent = cheerio.load(loginResponse.data)
        const postLogoutText = postLoginContent("li.icon-logout a").text()

        if (postLogoutText.includes("Logout")) {
            Logger.success("Logged in successfully!")
            return { success: true, html: loginResponse.data }
        } else {
            Logger.warn("Login failed, CAPTCHA may be required.")
            return { success: false, html: loginResponse.data }
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
        const { success, html } = await attemptLogin()

        if (success) {
            saveCookiesToFile(cookieJar, COOKIE_FILE_PATH)
            return
        }

        // Step 2: Use the HTML from the failed login to check for CAPTCHA
        Logger.debug("Attempting login again with reCAPTCHA...")

        // Use the response HTML from the failed login to check for reCAPTCHA
        const $ = cheerio.load(html)

        // Check for reCAPTCHA site key
        const siteKey = $("div.g-recaptcha").attr("data-sitekey")
        if (!siteKey) {
            Logger.error("No reCAPTCHA found, but login still failed.")
        }

        Logger.debug(`Found reCAPTCHA site key: ${siteKey}`)

        // Step 3: Solve the reCAPTCHA
        const captchaSolution = await solver.recaptcha({
            googlekey: siteKey,
            pageurl: "https://www.chickensmoothie.com/Forum/ucp.php?mode=login",
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
    POUND_REMIND_TIMES = await collection.distinct("pound")
    LAF_REMIND_TIMES = await collection.distinct("laf")
}

export const getOpeningTime = async () => {
    try {
        // Make the request to the URL using axiosClient and the existing cookie jar
        const response = await axiosClient.get(
            "https://www.chickensmoothie.com/poundandlostandfound.php",
        )

        // Load the HTML response into Cheerio
        const $ = cheerio.load(response.data)

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
            const [_, openingType, hours, minutes] = match

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
    if (openingType === "pound") {
        return await collection.find({ pound: time }).toArray()
    }
    if (openingType === "lost and found") {
        return await collection.find({ laf: time }).toArray()
    }
}

export const getRarePoundPets = async () => {
    // Log in and check if successful
    await login()

    try {
        // Fetch the pound page HTML using axiosClient
        const { data: pageHtml } = await axiosClient.get(POUND_URL)

        // Load the HTML into cheerio for parsing
        const $ = cheerio.load(pageHtml)
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
