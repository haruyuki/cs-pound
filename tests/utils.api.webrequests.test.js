import { existsSync, readFileSync } from "node:fs"
import axios from "axios"
import * as cheerio from "cheerio"
import { CookieJar } from "tough-cookie"

import {
    loadCookiesFromFile,
    makeGETRequest,
    makePOSTRequest,
    requestCache,
} from "../utils/api/webrequests.js"
import { Logger } from "../utils/common/logger.js"

// Mock dependencies
jest.mock("node:fs")
jest.mock("axios")
jest.mock("cheerio")
jest.mock("tough-cookie")

// Use global mocks for internal modules
jest.mock("../utils/common/logger.js")

jest.mock("../utils/cache/singleton.js", () => ({
    createCache: jest.fn(() => ({
        has: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
    })),
}))

describe("loadCookiesFromFile", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    test("loads cookies from file when file exists", () => {
        // Mock file existence and content
        existsSync.mockReturnValue(true)
        readFileSync.mockReturnValue(JSON.stringify({ cookies: [] }))
        CookieJar.deserializeSync.mockReturnValue(new CookieJar())

        const result = loadCookiesFromFile("/path/to/cookies.json")

        expect(existsSync).toHaveBeenCalledWith("/path/to/cookies.json")
        expect(readFileSync).toHaveBeenCalledWith(
            "/path/to/cookies.json",
            "utf-8",
        )
        expect(CookieJar.deserializeSync).toHaveBeenCalled()
        expect(result).toBeDefined()
    })

    test("creates new cookie jar when file doesn't exist", () => {
        // Mock file non-existence
        existsSync.mockReturnValue(false)

        const result = loadCookiesFromFile("/path/to/cookies.json")

        expect(existsSync).toHaveBeenCalledWith("/path/to/cookies.json")
        expect(readFileSync).not.toHaveBeenCalled()
        expect(Logger.warn).toHaveBeenCalled()
        expect(result).toBeDefined()
    })
})

describe("makeGETRequest", () => {
    const mockAxiosGet = axios.create().get
    const mockCheerioLoad = cheerio.load

    beforeEach(() => {
        jest.clearAllMocks()
    })

    test("returns cached response when available", async () => {
        // Mock cache hit
        requestCache.general.has.mockReturnValue(true)
        // Mock a cached HTML string that will be converted to a cheerio object
        requestCache.general.get.mockReturnValue(
            "<html><body>cached content</body></html>",
        )

        // Mock cheerio.load to return a mock cheerio object when loading the cached HTML
        mockCheerioLoad.mockReturnValue({
            find: jest.fn(),
            text: jest.fn(),
            val: jest.fn(),
        })

        const result = await makeGETRequest("https://example.com", {
            use: true,
            type: "general",
        })

        expect(requestCache.general.has).toHaveBeenCalledWith(
            "GET:https://example.com",
        )
        expect(requestCache.general.get).toHaveBeenCalledWith(
            "GET:https://example.com",
        )
        expect(mockAxiosGet).not.toHaveBeenCalled()
        expect(mockCheerioLoad).toHaveBeenCalledWith(
            "<html><body>cached content</body></html>",
        )
        expect(result).toEqual(
            expect.objectContaining({
                find: expect.any(Function),
                text: expect.any(Function),
                val: expect.any(Function),
            }),
        )
    })

    test("makes GET request and caches response when not in cache", async () => {
        // Mock cache miss and successful request
        requestCache.general.has.mockReturnValue(false)
        mockAxiosGet.mockResolvedValue({ data: '<html lang="en"></html>' })

        // Create a mock cheerio object with html method
        const mockCheerioObject = {
            find: jest.fn(),
            text: jest.fn(),
            val: jest.fn(),
            html: jest.fn().mockReturnValue('<html lang="en"></html>'),
        }
        mockCheerioLoad.mockReturnValue(mockCheerioObject)

        const result = await makeGETRequest("https://example.com", {
            use: true,
            type: "general",
        })

        expect(requestCache.general.has).toHaveBeenCalledWith(
            "GET:https://example.com",
        )
        expect(mockAxiosGet).toHaveBeenCalledWith(
            "https://example.com",
            expect.any(Object),
        )
        expect(mockCheerioLoad).toHaveBeenCalledWith('<html lang="en"></html>')
        expect(requestCache.general.set).toHaveBeenCalledWith(
            "GET:https://example.com",
            '<html lang="en"></html>',
        )
        expect(result).toBe(mockCheerioObject)
    })

    test("doesn't use cache when caching is disabled", async () => {
        // Mock successful request with caching disabled
        mockAxiosGet.mockResolvedValue({ data: '<html lang="en"></html>' })

        // Create a mock cheerio object with html method
        const mockCheerioObject = {
            find: jest.fn(),
            text: jest.fn(),
            val: jest.fn(),
            html: jest.fn().mockReturnValue('<html lang="en"></html>'),
        }
        mockCheerioLoad.mockReturnValue(mockCheerioObject)

        const result = await makeGETRequest("https://example.com", {
            use: false,
        })

        expect(requestCache.general.has).not.toHaveBeenCalled()
        expect(mockAxiosGet).toHaveBeenCalledWith(
            "https://example.com",
            expect.any(Object),
        )
        expect(mockCheerioLoad).toHaveBeenCalledWith('<html lang="en"></html>')
        expect(requestCache.general.set).not.toHaveBeenCalled()
        expect(result).toBe(mockCheerioObject)
    })

    test("handles request errors properly", async () => {
        // Mock request failure
        mockAxiosGet.mockRejectedValue(new Error("Network error"))

        await expect(makeGETRequest("https://example.com")).rejects.toThrow(
            "Network error",
        )
        expect(Logger.error).toHaveBeenCalled()
    })
})

describe("makePOSTRequest", () => {
    const mockAxiosPost = axios.create().post
    const mockCheerioLoad = cheerio.load

    beforeEach(() => {
        jest.clearAllMocks()
    })

    test("makes POST request and returns cheerio object", async () => {
        // Mock successful POST request
        mockAxiosPost.mockResolvedValue({
            data: '<html lang="en"></html>',
            headers: { "content-type": "text/html" },
        })
        mockCheerioLoad.mockReturnValue("cheerio-object")

        const result = await makePOSTRequest(
            "https://example.com",
            "key=value",
            true,
            true,
        )

        expect(mockAxiosPost).toHaveBeenCalledWith(
            "https://example.com",
            "key=value",
            expect.objectContaining({
                headers: expect.any(Object),
            }),
        )
        expect(mockCheerioLoad).toHaveBeenCalledWith('<html lang="en"></html>')
        expect(result).toBe("cheerio-object")
    })

    test("handles POST request errors properly", async () => {
        // Mock POST request failure
        mockAxiosPost.mockRejectedValue(new Error("Network error"))

        await expect(
            makePOSTRequest("https://example.com", "key=value"),
        ).rejects.toThrow("Network error")
        expect(Logger.error).toHaveBeenCalled()
    })
})
