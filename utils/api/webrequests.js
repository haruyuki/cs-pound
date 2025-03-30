import { existsSync, readFileSync } from "node:fs"
import axios from "axios"
import { wrapper } from "axios-cookiejar-support"
import * as cheerio from "cheerio"
import { CookieJar } from "tough-cookie"

import { COOKIE_FILE_PATH, WEB_REQUEST_CONFIG } from "../../config.js"
import { createCache } from "../cache/singleton.js"
import { Logger } from "../common/logger.js"

export const HEADERS = WEB_REQUEST_CONFIG.HEADERS

export const cookieJar = loadCookiesFromFile(COOKIE_FILE_PATH)

// Create request cache with different TTLs for different types of requests
export const requestCache = {
    // General cache for most requests (5 minutes TTL)
    general: createCache(WEB_REQUEST_CONFIG.CACHE.TTL.GENERAL),
    // Short-lived cache for frequently changing data (1 minute TTL)
    short: createCache(WEB_REQUEST_CONFIG.CACHE.TTL.SHORT),
    // Long-lived cache for static content (60 minutes TTL)
    static: createCache(WEB_REQUEST_CONFIG.CACHE.TTL.STATIC),
}

// Configure axios with connection pooling
const axiosClient = wrapper(
    axios.create({
        jar: cookieJar,
        withCredentials: true,
        headers: HEADERS,
        // Enable connection pooling
        // Maximum number of sockets
        maxSockets: 10,
        // Maximum number of free sockets
        maxFreeSockets: 5,
        // 10 seconds timeout
        timeout: 10000,
        // Retry configuration
        retry: 3,
        retryDelay: 1000,
    }),
)

/**
 * Loads cookies from a file or creates a new cookie jar if the file doesn't exist
 * @param {string} filepath - Path to the cookie file
 * @returns {CookieJar} The loaded cookie jar or a new one if file doesn't exist
 */
function loadCookiesFromFile(filepath) {
    Logger.debug("Loading cookies from file...")
    if (existsSync(filepath)) {
        const serializedCookies = readFileSync(filepath, "utf-8")
        return CookieJar.deserializeSync(JSON.parse(serializedCookies))
    }
    Logger.warn("No cookies found in file, creating a new cookie jar.")
    return new CookieJar()
}

/**
 * Makes a GET request to the specified URL with caching support
 * @param {string} url - The URL to make the GET request to
 * @param {Object} cacheOptions - Options for caching the response
 * @param {boolean} cacheOptions.use - Whether to use caching (default: true)
 * @param {string} cacheOptions.type - Cache type to use: "general", "short", or "static" (default: "general")
 * @returns {Promise<Object>} Cheerio object containing the parsed HTML response
 * @throws {Error} If the request fails
 */
export async function makeGETRequest(
    url,
    cacheOptions = { use: true, type: "general" },
) {
    try {
        // Generate a cache key based on the URL
        const cacheKey = `GET:${url}`

        // Check if caching is enabled and if the response is in cache
        if (cacheOptions.use && requestCache[cacheOptions.type].has(cacheKey)) {
            Logger.debug(`Cache hit for ${url}`)
            return requestCache[cacheOptions.type].get(cacheKey)
        }

        Logger.debug(`Making GET request to ${url}`)
        const response = await axiosClient.get(url, {
            headers: {
                ...HEADERS,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        })

        const $ = cheerio.load(response.data)

        // Cache the response if caching is enabled
        if (cacheOptions.use) {
            requestCache[cacheOptions.type].set(cacheKey, $)
        }

        return $
    } catch (error) {
        Logger.error(`Error making GET request to ${url}: ${error.message}`)
        throw error
    }
}

/**
 * Makes a POST request to the specified URL
 * @param {string} url - The URL to make the POST request to
 * @param {string|Object} data - The data to send in the request body
 * @param {boolean} includeCredentials - Whether to include credentials in the request (default: false)
 * @param {boolean} stateless - Whether to use a stateless client without cookies (default: false)
 * @param {Object} cacheOptions - Options for caching the response
 * @param {boolean} cacheOptions.use - Whether to use caching (default: false)
 * @param {string} cacheOptions.type - Cache type to use: "general", "short", or "static" (default: "general")
 * @returns {Promise<Object>} Cheerio object containing the parsed HTML response or JSON data
 * @throws {Error} If the request fails
 */
export async function makePOSTRequest(
    url,
    data,
    includeCredentials = false,
    stateless = false,
    cacheOptions = { use: false, type: "general" },
) {
    try {
        // For POST requests, we generally don't want to cache, but some specific
        // POST requests that don't modify data could benefit from caching
        const cacheKey = cacheOptions.use
            ? `POST:${url}:${JSON.stringify(data)}`
            : null

        // Check cache if enabled
        if (cacheOptions.use && requestCache[cacheOptions.type].has(cacheKey)) {
            Logger.debug(`Cache hit for POST ${url}`)
            return requestCache[cacheOptions.type].get(cacheKey)
        }

        // Create appropriate client based on stateless flag
        const client = stateless
            ? axios.create({
                withCredentials: false,
                headers: {
                    ...HEADERS,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                // 10 seconds timeout
                timeout: 10000,
            })
            : axiosClient

        Logger.debug(`Making POST request to ${url}`)
        const response = await client.post(url, data, {
            headers: {
                ...HEADERS,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            withCredentials: includeCredentials && !stateless,
        })

        let result
        const contentType = response.headers["content-type"] || ""
        if (contentType.includes("application/json")) {
            result = response.data
        } else {
            result = cheerio.load(response.data)
        }

        // Cache the response if caching is enabled
        if (cacheOptions.use) {
            requestCache[cacheOptions.type].set(cacheKey, result)
        }

        return result
    } catch (error) {
        Logger.error(`Error making POST request to ${url}: ${error.message}`)
        // Rethrow the error for better error handling upstream
        throw error
    }
}
