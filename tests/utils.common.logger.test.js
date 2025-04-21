import moment from "moment-timezone"

import { Logger } from "../utils/common/logger.js"

// Mock console methods
console.log = jest.fn()
console.warn = jest.fn()
console.error = jest.fn()

// Mock moment-timezone
jest.mock("moment-timezone", () => {
    const mockMoment = {
        tz: jest.fn().mockReturnThis(),
        format: jest.fn().mockReturnValue("2023-05-15 14:30:45"),
    }
    return jest.fn(() => mockMoment)
})

describe("Logger", () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks()
    })

    test("info logs messages with correct format and color", () => {
        Logger.info("Test info message")

        expect(moment().tz).toHaveBeenCalledWith("Australia/Sydney")
        expect(moment().format).toHaveBeenCalledWith("YYYY-MM-DD HH:mm:ss")
        expect(console.log).toHaveBeenCalledTimes(1)
        // We can't easily test the exact string with chalk colors, but we can check it contains our message
        expect(console.log.mock.calls[0][0]).toContain("Test info message")
        expect(console.log.mock.calls[0][0]).toContain("INFO")
    })

    test("warn logs messages with correct format and color", () => {
        Logger.warn("Test warning message")

        expect(moment().tz).toHaveBeenCalledWith("Australia/Sydney")
        expect(moment().format).toHaveBeenCalledWith("YYYY-MM-DD HH:mm:ss")
        expect(console.warn).toHaveBeenCalledTimes(1)
        expect(console.warn.mock.calls[0][0]).toContain("Test warning message")
        expect(console.warn.mock.calls[0][0]).toContain("WARN")
    })

    test("error logs messages with correct format and color", () => {
        Logger.error("Test error message")

        expect(moment().tz).toHaveBeenCalledWith("Australia/Sydney")
        expect(moment().format).toHaveBeenCalledWith("YYYY-MM-DD HH:mm:ss")
        expect(console.error).toHaveBeenCalledTimes(1)
        expect(console.error.mock.calls[0][0]).toContain("Test error message")
        expect(console.error.mock.calls[0][0]).toContain("ERROR")
    })

    test("success logs messages with correct format and color", () => {
        Logger.success("Test success message")

        expect(moment().tz).toHaveBeenCalledWith("Australia/Sydney")
        expect(moment().format).toHaveBeenCalledWith("YYYY-MM-DD HH:mm:ss")
        expect(console.log).toHaveBeenCalledTimes(1)
        expect(console.log.mock.calls[0][0]).toContain("Test success message")
        expect(console.log.mock.calls[0][0]).toContain("SUCCESS")
    })

    test("debug does not log messages when debug mode is disabled", () => {
        // Debug mode is disabled by default
        Logger.debug("Test debug message")

        expect(console.log).not.toHaveBeenCalled()
    })

    test("debug logs messages when debug mode is enabled", () => {
        // Enable debug mode
        Logger.enableDebug()

        Logger.debug("Test debug message")

        expect(moment().tz).toHaveBeenCalledWith("Australia/Sydney")
        expect(moment().format).toHaveBeenCalledWith("YYYY-MM-DD HH:mm:ss")
        expect(console.log).toHaveBeenCalledTimes(1)
        expect(console.log.mock.calls[0][0]).toContain("Test debug message")
        expect(console.log.mock.calls[0][0]).toContain("DEBUG")

        // Disable debug mode for other tests
        Logger.disableDebug()
    })

    test("enableDebug and disableDebug toggle debug mode correctly", () => {
        // Enable debug mode
        Logger.enableDebug()

        Logger.debug("Debug enabled")
        expect(console.log).toHaveBeenCalledTimes(1)

        // Clear mocks
        jest.clearAllMocks()

        // Disable debug mode
        Logger.disableDebug()

        Logger.debug("Debug disabled")
        expect(console.log).not.toHaveBeenCalled()
    })
})
