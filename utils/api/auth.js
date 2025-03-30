import { writeFileSync } from "node:fs"
import { Solver } from "@2captcha/captcha-solver"
import dotenv from "dotenv"
import { google } from "googleapis"

import { CAPTCHA_CONFIG, COOKIE_FILE_PATH, CS_CONFIG } from "../../config.js"
import { Logger } from "../common/logger.js"
import { cookieJar, makeGETRequest, makePOSTRequest } from "./webrequests.js"

dotenv.config()

const solver = new Solver(CAPTCHA_CONFIG.API_KEY)

/**
 * Saves cookies to a file for persistent storage
 * @param {CookieJar} jar - The cookie jar containing cookies to save
 * @param {string} filepath - The path where the cookies will be saved
 */
function saveCookiesToFile(jar, filepath) {
    const serializedCookies = JSON.stringify(jar.serializeSync())
    writeFileSync(filepath, serializedCookies, "utf-8")
}

/**
 * Attempts to log in to the Chicken Smoothie website
 * @param {string|null} captchaSolution - Optional CAPTCHA solution if required
 * @returns {Promise<{success: boolean, html: object|null}>} Login result with success status and HTML content
 */
const attemptLogin = async (captchaSolution = null) => {
    try {
        const $ = await makeGETRequest(CS_CONFIG.URLS.LOGIN, {
            use: true,
            type: "short",
        })

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

/**
 * Handles the complete login process including CAPTCHA solving if needed
 * Attempts a normal login first, and if that fails due to CAPTCHA,
 * solves the CAPTCHA and tries again
 * @returns {Promise<void>}
 */
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

/**
 * Authenticates with Google Sheets API using service account credentials
 * @returns {object} Configured Google Sheets API client with authentication
 */
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
