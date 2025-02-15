import { existsSync, readFileSync } from "node:fs"
import axios from "axios"
import { wrapper } from "axios-cookiejar-support"
import * as cheerio from "cheerio"
import { CookieJar } from "tough-cookie"

import { Logger } from "./logger.js"

export const BOT_VERSION = "2025.02.15"
const COOKIE_FILE_PATH = "./cookies.json"
export const HEADERS = {
    "User-Agent": "CS Pound Discord Bot Agent " + BOT_VERSION,
    From: "haru@haruyuki.moe",
}

export const cookieJar = loadCookiesFromFile(COOKIE_FILE_PATH)
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

export async function makeGETRequest(url) {
    try {
        const response = await axiosClient.get(url, {
            headers: {
                ...HEADERS,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        })
        return cheerio.load(response.data)
    } catch (error) {
        Logger.error(error)
    }
}

export async function makePOSTRequest(
    url,
    data,
    includeCredentials = false,
    stateless = false,
) {
    try {
        const client = stateless
            ? axios.create({
                withCredentials: false,
                headers: {
                    ...HEADERS,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            })
            : axiosClient

        const response = await client.post(url, data, {
            headers: {
                ...HEADERS,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            withCredentials: includeCredentials && !stateless,
        })

        const contentType = response.headers["content-type"]
        if (contentType.includes("application/json")) {
            return response.data
        } else {
            return cheerio.load(response.data)
        }
    } catch (error) {
        Logger.error(error)
    }
}
