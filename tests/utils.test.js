import { formatter, parseTimeString } from "../utils/utils.js"

describe("formatter", () => {
    test("formats single seconds correctly", () => {
        expect(formatter([0, 0, 1])).toBe("1 second")
        expect(formatter([0, 0, 2])).toBe("2 seconds")
        expect(formatter([0, 0, 10])).toBe("10 seconds")
    })

    test("formats single minutes correctly", () => {
        expect(formatter([0, 1, 0])).toBe("1 minute")
        expect(formatter([0, 2, 0])).toBe("2 minutes")
        expect(formatter([0, 10, 0])).toBe("10 minutes")
    })

    test("formats single hours correctly", () => {
        expect(formatter([1, 0, 0])).toBe("1 hour")
        expect(formatter([2, 0, 0])).toBe("2 hours")
        expect(formatter([10, 0, 0])).toBe("10 hours")
    })

    test("formats minutes and seconds correctly", () => {
        expect(formatter([0, 1, 1])).toBe("1 minute and 1 second")
        expect(formatter([0, 1, 2])).toBe("1 minute and 2 seconds")
        expect(formatter([0, 1, 10])).toBe("1 minute and 10 seconds")

        expect(formatter([0, 2, 1])).toBe("2 minutes and 1 second")
        expect(formatter([0, 2, 2])).toBe("2 minutes and 2 seconds")
        expect(formatter([0, 2, 10])).toBe("2 minutes and 10 seconds")

        expect(formatter([0, 10, 1])).toBe("10 minutes and 1 second")
        expect(formatter([0, 10, 2])).toBe("10 minutes and 2 seconds")
        expect(formatter([0, 10, 10])).toBe("10 minutes and 10 seconds")
    })

    test("formats hours and seconds correctly", () => {
        expect(formatter([1, 0, 1])).toBe("1 hour and 1 second")
        expect(formatter([1, 0, 2])).toBe("1 hour and 2 seconds")
        expect(formatter([1, 0, 10])).toBe("1 hour and 10 seconds")

        expect(formatter([2, 0, 1])).toBe("2 hours and 1 second")
        expect(formatter([2, 0, 2])).toBe("2 hours and 2 seconds")
        expect(formatter([2, 0, 10])).toBe("2 hours and 10 seconds")

        expect(formatter([10, 0, 1])).toBe("10 hours and 1 second")
        expect(formatter([10, 0, 2])).toBe("10 hours and 2 seconds")
        expect(formatter([10, 0, 10])).toBe("10 hours and 10 seconds")
    })

    test("formats hours and minutes correctly", () => {
        expect(formatter([1, 1, 0])).toBe("1 hour and 1 minute")
        expect(formatter([1, 2, 0])).toBe("1 hour and 2 minutes")
        expect(formatter([1, 10, 0])).toBe("1 hour and 10 minutes")

        expect(formatter([2, 1, 0])).toBe("2 hours and 1 minute")
        expect(formatter([2, 2, 0])).toBe("2 hours and 2 minutes")
        expect(formatter([2, 10, 0])).toBe("2 hours and 10 minutes")

        expect(formatter([10, 1, 0])).toBe("10 hours and 1 minute")
        expect(formatter([10, 2, 0])).toBe("10 hours and 2 minutes")
        expect(formatter([10, 10, 0])).toBe("10 hours and 10 minutes")
    })

    test("formats hours, minutes, and seconds correctly", () => {
        expect(formatter([1, 1, 1])).toBe("1 hour, 1 minute and 1 second")
        expect(formatter([1, 1, 2])).toBe("1 hour, 1 minute and 2 seconds")
        expect(formatter([1, 1, 10])).toBe("1 hour, 1 minute and 10 seconds")

        expect(formatter([1, 2, 1])).toBe("1 hour, 2 minutes and 1 second")
        expect(formatter([1, 2, 2])).toBe("1 hour, 2 minutes and 2 seconds")
        expect(formatter([1, 2, 10])).toBe("1 hour, 2 minutes and 10 seconds")

        expect(formatter([1, 10, 1])).toBe("1 hour, 10 minutes and 1 second")
        expect(formatter([1, 10, 2])).toBe("1 hour, 10 minutes and 2 seconds")
        expect(formatter([1, 10, 10])).toBe("1 hour, 10 minutes and 10 seconds")

        expect(formatter([2, 1, 1])).toBe("2 hours, 1 minute and 1 second")
        expect(formatter([2, 1, 2])).toBe("2 hours, 1 minute and 2 seconds")
        expect(formatter([2, 1, 10])).toBe("2 hours, 1 minute and 10 seconds")

        expect(formatter([2, 2, 1])).toBe("2 hours, 2 minutes and 1 second")
        expect(formatter([2, 2, 2])).toBe("2 hours, 2 minutes and 2 seconds")
        expect(formatter([2, 2, 10])).toBe("2 hours, 2 minutes and 10 seconds")

        expect(formatter([2, 10, 1])).toBe("2 hours, 10 minutes and 1 second")
        expect(formatter([2, 10, 2])).toBe("2 hours, 10 minutes and 2 seconds")
        expect(formatter([2, 10, 10])).toBe(
            "2 hours, 10 minutes and 10 seconds",
        )

        expect(formatter([10, 1, 1])).toBe("10 hours, 1 minute and 1 second")
        expect(formatter([10, 1, 2])).toBe("10 hours, 1 minute and 2 seconds")
        expect(formatter([10, 1, 10])).toBe("10 hours, 1 minute and 10 seconds")
    })
})

describe("parseTimeString", () => {
    test("parses single unit inputs correctly", () => {
        expect(parseTimeString("5h")).toEqual([5, 0, 0])
        expect(parseTimeString("30m")).toEqual([0, 30, 0])
        expect(parseTimeString("45s")).toEqual([0, 0, 45])
    })

    test("parses multiple unit inputs correctly", () => {
        expect(parseTimeString("1h30m")).toEqual([1, 30, 0])
        expect(parseTimeString("30m45s")).toEqual([0, 30, 45])
        expect(parseTimeString("1h45s")).toEqual([1, 0, 45])
        expect(parseTimeString("1h30m45s")).toEqual([1, 30, 45])
    })

    test("parses plain number inputs as minutes", () => {
        expect(parseTimeString("30")).toEqual([0, 30, 0])
        expect(parseTimeString("0")).toEqual([0, 0, 0])
        expect(parseTimeString("120")).toEqual([2, 0, 0])
    })

    test("normalizes time values correctly", () => {
        expect(parseTimeString("70s")).toEqual([0, 1, 10])
        expect(parseTimeString("90m")).toEqual([1, 30, 0])
        expect(parseTimeString("120m")).toEqual([2, 0, 0])
        expect(parseTimeString("90m70s")).toEqual([1, 31, 10])
    })

    test("handles invalid inputs correctly", () => {
        expect(parseTimeString("invalid")).toEqual([0, 0, 0])
        expect(parseTimeString("h30m")).toEqual([0, 0, 0])
        expect(parseTimeString("30x")).toEqual([0, 0, 0])
        expect(parseTimeString("30m45")).toEqual([0, 0, 0])
        expect(parseTimeString("")).toEqual([0, 0, 0])
    })

    test("handles edge cases correctly", () => {
        expect(parseTimeString("0h0m0s")).toEqual([0, 0, 0])
        expect(parseTimeString("1h0m0s")).toEqual([1, 0, 0])
        expect(parseTimeString("0h1m0s")).toEqual([0, 1, 0])
        expect(parseTimeString("0h0m1s")).toEqual([0, 0, 1])
    })
})
