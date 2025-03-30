import { convertCurrency, getExchangeRates } from "../utils/api/flightrising.js"
import {
    handleCSConversion,
    handleGemsConversion,
    handleTreasureConversion,
} from "../utils/common/conversion.js"

// Mock the flightrising API functions
jest.mock("../utils/api/flightrising.js", () => ({
    convertCurrency: jest.fn(),
    getExchangeRates: jest.fn(),
}))

describe("Currency Conversion Handlers", () => {
    // Mock interaction object
    const mockInteraction = {
        reply: jest.fn().mockResolvedValue(undefined),
    }

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks()

        // Default mock implementation for getExchangeRates
        // Returns [csExchangeRate, gemExchangeRate, treasureExchangeRate]
        getExchangeRates.mockResolvedValue([10, 5, 2])
    })

    describe("handleGemsConversion", () => {
        test("converts gems to CS and treasure correctly", async () => {
            // Mock convertCurrency to return expected values. Uses simplified conversion for testing
            convertCurrency.mockImplementation((amount, rate1, rate2) => {
                if (rate1 === 5 && rate2 === 10) {
                    return amount * 2
                } else if (rate1 === 1 && rate2 === 2) {
                    return amount * 2
                }
                return 0
            })

            await handleGemsConversion(mockInteraction, 100)

            // Check that convertCurrency was called with correct parameters
            expect(convertCurrency).toHaveBeenCalledTimes(2)
            expect(convertCurrency).toHaveBeenNthCalledWith(1, 100, 5, 10)
            expect(convertCurrency).toHaveBeenNthCalledWith(2, 100, 1, 2)

            // Check that interaction.reply was called with correct message
            expect(mockInteraction.reply).toHaveBeenCalledTimes(1)
            expect(mockInteraction.reply).toHaveBeenCalledWith(
                "100 gems is equal to approximately:\n200C$\n200 treasure\n(Based on the ratio 1C$:10g and 1g:5t)",
            )
        })

        test("handles zero amount correctly", async () => {
            convertCurrency.mockReturnValue(0)

            await handleGemsConversion(mockInteraction, 0)

            expect(mockInteraction.reply).toHaveBeenCalledWith(
                "0 gems is equal to approximately:\n0C$\n0 treasure\n(Based on the ratio 1C$:10g and 1g:5t)",
            )
        })
    })

    describe("handleTreasureConversion", () => {
        test("converts treasure to gems and CS correctly", async () => {
            // First call converts treasure to gems
            // Second call converts gems to CS
            convertCurrency
                // 100 treasure -> 50 gems
                .mockReturnValueOnce(50)
                // 50 gems -> 25 CS
                .mockReturnValueOnce(25)

            await handleTreasureConversion(mockInteraction, 100)

            // Check that convertCurrency was called with correct parameters
            expect(convertCurrency).toHaveBeenCalledTimes(2)
            expect(convertCurrency).toHaveBeenNthCalledWith(1, 100, 2, 1)
            expect(convertCurrency).toHaveBeenNthCalledWith(2, 50, 5, 10)

            // Check that interaction.reply was called with correct message
            expect(mockInteraction.reply).toHaveBeenCalledTimes(1)
            expect(mockInteraction.reply).toHaveBeenCalledWith(
                "100 treasure is equal to approximately:\n25C$\n50 gems\n(Based on the ratio 1C$:10g and 1g:5t)",
            )
        })

        test("handles zero amount correctly", async () => {
            convertCurrency.mockReturnValue(0)

            await handleTreasureConversion(mockInteraction, 0)

            expect(mockInteraction.reply).toHaveBeenCalledWith(
                "0 treasure is equal to approximately:\n0C$\n0 gems\n(Based on the ratio 1C$:10g and 1g:5t)",
            )
        })
    })

    describe("handleCSConversion", () => {
        test("converts CS to gems and treasure correctly", async () => {
            // First call converts CS to gems
            // Second call converts gems to treasure
            convertCurrency
                // 20 CS -> 200 gems
                .mockReturnValueOnce(200)
                // 200 gems -> 400 treasure
                .mockReturnValueOnce(400)

            await handleCSConversion(mockInteraction, 20)

            // Check that convertCurrency was called with correct parameters
            expect(convertCurrency).toHaveBeenCalledTimes(2)
            expect(convertCurrency).toHaveBeenNthCalledWith(1, 20, 10, 5)
            expect(convertCurrency).toHaveBeenNthCalledWith(2, 200, 1, 2)

            // Check that interaction.reply was called with correct message
            expect(mockInteraction.reply).toHaveBeenCalledTimes(1)
            expect(mockInteraction.reply).toHaveBeenCalledWith(
                "20C$ is equal to approximately:\n200 gems\n400 treasure\n(Based on the ratio 1C$:10g and 1g:5t)",
            )
        })

        test("handles zero amount correctly", async () => {
            convertCurrency.mockReturnValue(0)

            await handleCSConversion(mockInteraction, 0)

            expect(mockInteraction.reply).toHaveBeenCalledWith(
                "0C$ is equal to approximately:\n0 gems\n0 treasure\n(Based on the ratio 1C$:10g and 1g:5t)",
            )
        })
    })

    test("handles API errors gracefully", async () => {
        // Mock getExchangeRates to throw an error
        getExchangeRates.mockRejectedValue(new Error("API Error"))

        // We expect the function to catch the error and not throw it
        await expect(
            handleGemsConversion(mockInteraction, 100),
        ).rejects.toThrow("API Error")
    })
})
