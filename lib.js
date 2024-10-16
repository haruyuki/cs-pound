import dotenv from "dotenv"
import { google } from "googleapis"
import { MongoClient } from "mongodb"
import { launch } from "rebrowser-puppeteer"
import Sequelize, { NUMBER, STRING } from "sequelize"

import { Logger } from "./logger.js"

const client = new MongoClient(process.env.MONGODB_URI)
const database = client.db("cs_pound")
const collection = database.collection("auto_remind")

dotenv.config()

export const BOT_VERSION = "2024.10.09"
export const HEADERS = {
    "User-Agent": "CS Pound Discord Bot Agent " + BOT_VERSION,
    From: "haru@haruyuki.moe",
}
export let POUND_REMIND_TIMES = []
export let LAF_REMIND_TIMES = []

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

export const updateAutoRemindTimes = async () => {
    POUND_REMIND_TIMES = await collection.distinct("pound")
    LAF_REMIND_TIMES = await collection.distinct("laf")
}

export const getOpeningTime = async () => {
    const browser = await launch({ userDataDir: "./chrome_data" })
    const page = await browser.newPage()
    await page.setExtraHTTPHeaders(HEADERS)
    await page.setRequestInterception(true)
    page.on("request", (request) => {
        if (request.resourceType() === "image") request.abort()
        else request.continue()
    })
    await page.goto(
        "https://www.chickensmoothie.com/poundandlostandfound.php",
        {
            waitUntil: "domcontentloaded",
        },
    )
    const element = await page.$("h2:last-of-type")
    let text = (await element.evaluate((el) => el.textContent)).trim()
    let thingsRemaining = 0
    if (text === "The Pound" || text === "The Lost and Found") {
        const selector =
            text === "The Pound" ? "#pets_remaining" : "#items_remaining"
        thingsRemaining = await page.$(selector)
        thingsRemaining = parseInt(
            (await thingsRemaining.evaluate((el) => el.textContent))
                .trim()
                .match(/\d+/)[0],
        )
    }
    await browser.close()

    if (text === "The Pound") {
        return {
            openingType: "pound",
            timeRemaining: 0,
            thingsRemaining: thingsRemaining,
        }
    }
    if (text === "The Lost and Found") {
        return {
            openingType: "lost and found",
            timeRemaining: 0,
            thingsRemaining: thingsRemaining,
        }
    }

    const match = text.match(
        /(pound|lost and found).*?(?:in:|within)\s*(?:(\d+)\s*hours?)?\s*(?:,?\s*(\d+)\s*minutes?)?/i,
    )

    if (match) {
        const openingType = match[1].toLowerCase() // Capture the type (pound or lost and found)

        const hours = match[2]
            ? match[2] === "10"
                ? 1
                : parseInt(match[2])
            : 0 // Capture the hours, default to 0 if not present

        const minutes = match[3] ? parseInt(match[3]) : 0 // Capture the minutes, default to 0 if not present

        // Convert everything to minutes
        const timeInMinutes = hours * 60 + minutes

        return {
            openingType: openingType,
            timeRemaining: timeInMinutes,
            thingsRemaining: thingsRemaining,
        }
    }

    return null // Return null if the pattern is not found
}

export function formatter([h, m, s]) {
    return [
        h ? `${h} hour${h > 1 ? "s" : ""}${m || s ? ", " : ""}` : "",
        m ? `${m} minute${m > 1 ? "s" : ""}${s ? " and " : ""}` : "",
        s ? `${h || m ? "and " : ""}${s} second${s > 1 ? "s" : ""}` : "",
    ].join("")
}

export const login = async () => {
    const browser = await launch({ userDataDir: "./chrome_data" })
    const page = await browser.newPage()
    await page.setExtraHTTPHeaders(HEADERS)
    await page.goto("https://www.chickensmoothie.com/Forum/ucp.php?mode=login")
    const getLoginText = await page.evaluate(() => {
        return document.querySelector("li.icon-logout a").textContent
    })
    if (getLoginText.includes("Logout")) {
        Logger.info("Already logged in!")
        await browser.close()
        return true
    }

    await page.type("#username", process.env.CS_USERNAME)
    await page.type("#password", process.env.CS_PASSWORD)
    await page.click("input[name='autologin']")
    await page.click("input[name='login']")

    await page.waitForNavigation()

    await browser.close()
    Logger.success("Logged in successfully!")
    return true
}

export const authenticate = function () {
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    const auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    )
    return google.sheets({ version: "v4", auth })
}

export const getAutoRemindDocuments = async function (time, openingType) {
    if (openingType === "pound") {
        return await collection.find({ pound: time }).toArray()
    }
    if (openingType === "lost and found") {
        return await collection.find({ laf: time }).toArray()
    }
}
