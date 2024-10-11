import { launch } from "rebrowser-puppeteer"
import Sequelize, { NUMBER, STRING } from "sequelize"

import { Logger } from "./logger.js"

export const BOT_VERSION = "2024.10.09"
export const HEADERS = {
    "User-Agent": "CS Pound Discord Bot Agent " + BOT_VERSION,
    From: "haru@haruyuki.moe",
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

export const getPoundTime = async () => {
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
    const correction = {
        "Sorry, the pound is closed at the moment.": "",
        "Sorry, the Lost and Found is closed at the moment.": "",
        "\n": "",
        "\t": "",
    }
    const reg = new RegExp(Object.keys(correction).join("|"), "g")
    await browser.close()
    return text.replace(reg, (matched) => correction[matched])
}

export const login = async () => {
    Logger.info("Logging in to Chicken Smoothie...")
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
