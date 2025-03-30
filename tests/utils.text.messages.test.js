import { formatOpeningTime, formatOpenMessage } from "../utils/text/messages.js"

describe("formatOpeningTime", () => {
    test("formats time with only minutes correctly", () => {
        expect(formatOpeningTime("Pound", 1)).toBe(
            "The Pound will open in: 1 minute.",
        )
        expect(formatOpeningTime("Pound", 5)).toBe(
            "The Pound will open in: 5 minutes.",
        )
        expect(formatOpeningTime("Lost and Found", 1)).toBe(
            "The Lost and Found will open in: 1 minute.",
        )
        expect(formatOpeningTime("Lost and Found", 30)).toBe(
            "The Lost and Found will open in: 30 minutes.",
        )
    })

    test("formats time with only hours correctly", () => {
        expect(formatOpeningTime("Pound", 60)).toBe(
            "The Pound will open in: 1 hour.",
        )
        expect(formatOpeningTime("Pound", 120)).toBe(
            "The Pound will open within 2 hours.",
        )
        expect(formatOpeningTime("Lost and Found", 60)).toBe(
            "The Lost and Found will open in: 1 hour.",
        )
        expect(formatOpeningTime("Lost and Found", 180)).toBe(
            "The Lost and Found will open within 3 hours.",
        )
    })

    test("formats time with hours and minutes correctly", () => {
        expect(formatOpeningTime("Pound", 61)).toBe(
            "The Pound will open in: 1 hour, 1 minute.",
        )
        expect(formatOpeningTime("Pound", 62)).toBe(
            "The Pound will open in: 1 hour, 2 minutes.",
        )
        expect(formatOpeningTime("Pound", 121)).toBe(
            "The Pound will open within 2 hours, 1 minute.",
        )
        expect(formatOpeningTime("Pound", 122)).toBe(
            "The Pound will open within 2 hours, 2 minutes.",
        )
        expect(formatOpeningTime("Lost and Found", 61)).toBe(
            "The Lost and Found will open in: 1 hour, 1 minute.",
        )
        expect(formatOpeningTime("Lost and Found", 125)).toBe(
            "The Lost and Found will open within 2 hours, 5 minutes.",
        )
    })

    test("handles zero minutes correctly", () => {
        expect(formatOpeningTime("Pound", 60)).toBe(
            "The Pound will open in: 1 hour.",
        )
        expect(formatOpeningTime("Pound", 120)).toBe(
            "The Pound will open within 2 hours.",
        )
        expect(formatOpeningTime("Lost and Found", 180)).toBe(
            "The Lost and Found will open within 3 hours.",
        )
    })

    test("handles zero hours correctly", () => {
        expect(formatOpeningTime("Pound", 0)).toBe("")
        expect(formatOpeningTime("Lost and Found", 0)).toBe("")
    })
})

describe("formatOpenMessage", () => {
    test("formats Pound open message correctly", () => {
        expect(formatOpenMessage("Pound", 1)).toBe(
            "The Pound is currently open with 1 pets remaining! [Go adopt a pet from the Pound!](https://www.chickensmoothie.com/poundandlostandfound.php)",
        )
        expect(formatOpenMessage("Pound", 5)).toBe(
            "The Pound is currently open with 5 pets remaining! [Go adopt a pet from the Pound!](https://www.chickensmoothie.com/poundandlostandfound.php)",
        )
        expect(formatOpenMessage("Pound", 100)).toBe(
            "The Pound is currently open with 100 pets remaining! [Go adopt a pet from the Pound!](https://www.chickensmoothie.com/poundandlostandfound.php)",
        )
    })

    test("formats Lost and Found open message correctly", () => {
        expect(formatOpenMessage("Lost and Found", 1)).toBe(
            "The Lost and Found is currently open with 1 items remaining! [Go get an item from the Lost and Found!](https://www.chickensmoothie.com/poundandlostandfound.php)",
        )
        expect(formatOpenMessage("Lost and Found", 5)).toBe(
            "The Lost and Found is currently open with 5 items remaining! [Go get an item from the Lost and Found!](https://www.chickensmoothie.com/poundandlostandfound.php)",
        )
        expect(formatOpenMessage("Lost and Found", 100)).toBe(
            "The Lost and Found is currently open with 100 items remaining! [Go get an item from the Lost and Found!](https://www.chickensmoothie.com/poundandlostandfound.php)",
        )
    })

    test("handles different opening types correctly", () => {
        expect(formatOpenMessage("Custom Type", 10)).toBe(
            "The Custom Type is currently open with 10 items remaining! [Go get an item from the Custom Type!](https://www.chickensmoothie.com/poundandlostandfound.php)",
        )
    })
})
