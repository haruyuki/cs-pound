import { CS_CONFIG } from "../config.js"
import {
    formatTimeResponse,
    getOpeningTime,
} from "../utils/api/chickensmoothie.js"
import { makeGETRequest } from "../utils/api/webrequests.js"
import { formatOpeningTime, formatOpenMessage } from "../utils/text/messages.js"

// Mock logger module
jest.mock("../utils/common/logger.js")

// Mock webrequests module with only the needed functions
jest.mock("../utils/api/webrequests.js", () => ({
    makeGETRequest: jest.fn(),
}))

// Mock messages module
jest.mock("../utils/text/messages.js", () => ({
    formatOpeningTime: jest.fn(),
    formatOpenMessage: jest.fn(),
}))

describe("getOpeningTime", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    test("returns pound opening info when pound is open", async () => {
        // Mock cheerio function for open pound
        makeGETRequest.mockResolvedValue((selector) => {
            if (selector === "h2:last-of-type") {
                return { text: () => "The Pound" }
            } else if (selector === "#pets_remaining") {
                return { text: () => "50 pets remaining" }
            }
            return { text: () => "" }
        })

        const result = await getOpeningTime()

        expect(makeGETRequest).toHaveBeenCalledWith(CS_CONFIG.URLS.POUND_LAF, {
            use: false,
        })
        expect(result).toEqual({
            openingType: "pound",
            timeRemaining: 0,
            thingsRemaining: 50,
        })
    })

    test("returns lost and found opening info when lost and found is open", async () => {
        // Mock cheerio function for open lost and found
        makeGETRequest.mockResolvedValue((selector) => {
            if (selector === "h2:last-of-type") {
                return { text: () => "The Lost and Found" }
            } else if (selector === "#items_remaining") {
                return { text: () => "30 items remaining" }
            }
            return { text: () => "" }
        })

        const result = await getOpeningTime()

        expect(makeGETRequest).toHaveBeenCalledWith(CS_CONFIG.URLS.POUND_LAF, {
            use: false,
        })
        expect(result).toEqual({
            openingType: "lost and found",
            timeRemaining: 0,
            thingsRemaining: 30,
        })
    })

    test("returns pound opening time when pound will open soon", async () => {
        // Mock cheerio function for pound opening soon
        makeGETRequest.mockResolvedValue((selector) => {
            if (selector === "h2:last-of-type") {
                return {
                    text: () => "The pound will open in: 2 hours, 30 minutes",
                }
            }
            return { text: () => "" }
        })

        const result = await getOpeningTime()

        expect(result).toEqual({
            openingType: "pound",
            // 2 hours and 30 minutes = 150 minutes
            timeRemaining: 150,
            thingsRemaining: 0,
        })
    })

    test("returns lost and found opening time when lost and found will open soon", async () => {
        // Mock cheerio function for lost and found opening soon
        makeGETRequest.mockResolvedValue((selector) => {
            if (selector === "h2:last-of-type") {
                return {
                    text: () =>
                        "The Lost and Found will open within 45 minutes",
                }
            }
            return { text: () => "" }
        })

        const result = await getOpeningTime()

        expect(result).toEqual({
            openingType: "lost and found",
            timeRemaining: 45,
            thingsRemaining: 0,
        })
    })

    test("returns null when no opening information is found", async () => {
        // Mock cheerio function with no opening information
        makeGETRequest.mockResolvedValue((selector) => {
            if (selector === "h2:last-of-type") {
                return { text: () => "Some other text" }
            }
            return { text: () => "" }
        })

        const result = await getOpeningTime()

        expect(result).toBeNull()
    })

    test("handles errors gracefully", async () => {
        // Mock request error
        makeGETRequest.mockRejectedValue(new Error("Network error"))

        const result = await getOpeningTime()

        expect(result).toBeNull()
    })
})

describe("formatTimeResponse", () => {
    beforeEach(() => {
        jest.clearAllMocks()

        // Set up mock implementations for formatOpeningTime and formatOpenMessage
        formatOpeningTime.mockImplementation(
            (type, time) => `${type} will open in ${time} minutes.`,
        )
        formatOpenMessage.mockImplementation(
            (type, count) => `${type} is open with ${count} remaining.`,
        )
    })

    test("returns message for null opening time", () => {
        const result = formatTimeResponse(null)

        expect(result).toBe(
            "Sorry, both the Pound and Lost and Found are closed at the moment.",
        )
    })

    test("returns formatted message for open pound", () => {
        const openingTime = {
            openingType: "pound",
            timeRemaining: 0,
            thingsRemaining: 42,
        }

        const result = formatTimeResponse(openingTime)

        expect(formatOpenMessage).toHaveBeenCalledWith("Pound", 42)
        expect(result).toBe("Pound is open with 42 remaining.")
    })

    test("returns formatted message for open lost and found", () => {
        const openingTime = {
            openingType: "lost and found",
            timeRemaining: 0,
            thingsRemaining: 15,
        }

        const result = formatTimeResponse(openingTime)

        expect(formatOpenMessage).toHaveBeenCalledWith("Lost and Found", 15)
        expect(result).toBe("Lost and Found is open with 15 remaining.")
    })

    test("returns formatted message for pound opening soon", () => {
        const openingTime = {
            openingType: "pound",
            timeRemaining: 30,
            thingsRemaining: 0,
        }

        const result = formatTimeResponse(openingTime)

        expect(formatOpeningTime).toHaveBeenCalledWith("Pound", 30)
        expect(result).toBe("Pound will open in 30 minutes.")
    })

    test("returns formatted message for lost and found opening soon", () => {
        const openingTime = {
            openingType: "lost and found",
            timeRemaining: 45,
            thingsRemaining: 0,
        }

        const result = formatTimeResponse(openingTime)

        expect(formatOpeningTime).toHaveBeenCalledWith("Lost and Found", 45)
        expect(result).toBe("Lost and Found will open in 45 minutes.")
    })
})
