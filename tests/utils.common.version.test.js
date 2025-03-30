import { execSync } from "child_process"

import { Logger } from "../utils/common/logger.js"
import { getVersion, getVersionFromGit } from "../utils/common/version.js"

// Mock child_process.execSync
jest.mock("child_process", () => ({
    execSync: jest.fn(),
}))

// Mock Logger
jest.mock("../utils/common/logger.js", () => ({
    Logger: {
        error: jest.fn(),
    },
}))

describe("getVersionFromGit", () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks()
        // Restore console.error to avoid test pollution
        console.error = jest.fn()
    })

    test("returns correctly formatted version string when Git commands succeed", () => {
        // Mock successful Git command responses
        execSync.mockImplementationOnce(() => "2023-05-15 14:30:45 +0000")
        execSync.mockImplementationOnce(() => "abc1234")

        const result = getVersionFromGit()

        expect(execSync).toHaveBeenCalledTimes(2)
        expect(execSync).toHaveBeenNthCalledWith(
            1,
            "git log -1 --format=%cd --date=iso",
        )
        expect(execSync).toHaveBeenNthCalledWith(2, "git log -1 --format=%h")
        expect(result).toBe("2023.05.15 (abc1234)")
    })

    test("returns default version when Git commands fail", () => {
        // Mock Git command failure
        execSync.mockImplementationOnce(() => {
            throw new Error("Git command failed")
        })

        const result = getVersion()

        expect(execSync).toHaveBeenCalledTimes(1)
        expect(Logger.error).toHaveBeenCalledWith(
            "Failed to get version from Git:",
            "Git command failed",
        )
        expect(result).toBe("0000.00.00")
    })

    test("correctly formats date components with padding", () => {
        // Test with single-digit month and day
        execSync.mockImplementationOnce(() => "2023-1-5 14:30:45 +0000")
        execSync.mockImplementationOnce(() => "abc1234")

        const result = getVersionFromGit()

        expect(result).toBe("2023.01.05 (abc1234)")
    })
})

describe("getVersion", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    test("returns version from Git when successful", () => {
        // Mock successful Git version retrieval
        execSync.mockImplementationOnce(() => "2023-05-15 14:30:45 +0000")
        execSync.mockImplementationOnce(() => "abc1234")

        const result = getVersion()

        expect(result).toBe("2023.05.15 (abc1234)")
        expect(Logger.error).not.toHaveBeenCalled()
    })

    test("returns fallback version when Git version fails", () => {
        // Mock Git version failure
        execSync.mockImplementationOnce(() => {
            throw new Error("Git command failed")
        })

        const result = getVersion("1.2.3")

        expect(result).toBe("1.2.3")
        expect(Logger.error).toHaveBeenCalledWith(
            "Failed to get version:",
            "Git command failed",
        )
    })

    test("uses default fallback when none provided", () => {
        // Mock Git version failure
        execSync.mockImplementationOnce(() => {
            throw new Error("Git command failed")
        })

        const result = getVersion()

        expect(result).toBe("0000.00.00")
    })
})
