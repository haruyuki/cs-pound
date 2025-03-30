import {
    formatIdentificationReply,
    hasPetItems,
    hasPetParameter,
    isItemLink,
    isValidChickenSmoothieLink,
} from "../utils/api/identification.js"

describe("formatIdentificationReply", () => {
    test("formats item replies correctly", () => {
        expect(
            formatIdentificationReply(
                "Test Item",
                "Christmas",
                2022,
                "https://example.com/archive",
            ),
        ).toBe(
            "That item is 'Test Item' from 2022 Christmas!\nArchive Link: https://example.com/archive",
        )

        expect(
            formatIdentificationReply(
                "Rare Item",
                "Halloween",
                2021,
                "https://example.com/archive2",
            ),
        ).toBe(
            "That item is 'Rare Item' from 2021 Halloween!\nArchive Link: https://example.com/archive2",
        )
    })

    test("formats pet replies correctly", () => {
        expect(
            formatIdentificationReply(
                null,
                "Christmas",
                2022,
                "https://example.com/archive",
                false,
            ),
        ).toBe(
            "That pet is from 2022 Christmas!\nArchive Link: https://example.com/archive",
        )

        expect(
            formatIdentificationReply(
                null,
                "Halloween",
                2021,
                "https://example.com/archive2",
                false,
            ),
        ).toBe(
            "That pet is from 2021 Halloween!\nArchive Link: https://example.com/archive2",
        )
    })

    test("formats month-based events correctly", () => {
        expect(
            formatIdentificationReply(
                "Monthly Item",
                "January",
                2022,
                "https://example.com/archive",
            ),
        ).toBe(
            "That item is 'Monthly Item' from January 2022!\nArchive Link: https://example.com/archive",
        )

        expect(
            formatIdentificationReply(
                null,
                "December",
                2021,
                "https://example.com/archive2",
                false,
            ),
        ).toBe(
            "That pet is from December 2021!\nArchive Link: https://example.com/archive2",
        )
    })

    test("handles items with no name correctly", () => {
        expect(
            formatIdentificationReply(
                null,
                "Christmas",
                2022,
                "https://example.com/archive",
            ),
        ).toBe(
            "That item is from 2022 Christmas!\nArchive Link: https://example.com/archive",
        )
    })
})

describe("isValidChickenSmoothieLink", () => {
    test("identifies valid Chicken Smoothie links", () => {
        expect(
            isValidChickenSmoothieLink(
                "https://www.chickensmoothie.com/pet/123456.jpg",
            ),
        ).toBe(true)
        expect(
            isValidChickenSmoothieLink(
                "https://www.chickencdn.com/pet/123456.jpg",
            ),
        ).toBe(true)
        expect(
            isValidChickenSmoothieLink(
                "https://chickensmoothie.com/pet/123456.jpg",
            ),
        ).toBe(true)
    })

    test("rejects invalid links", () => {
        expect(
            isValidChickenSmoothieLink("https://example.com/pet/123456.jpg"),
        ).toBe(false)
        expect(
            isValidChickenSmoothieLink(
                "https://fake-chickensmoothie.com/pet/123456.jpg",
            ),
        ).toBe(false)
        expect(
            isValidChickenSmoothieLink(
                "https://chickensmothie.com/pet/123456.jpg",
            ),
        ).toBe(false)
    })
})

describe("hasPetItems", () => {
    test("identifies links with trans parameter", () => {
        expect(
            hasPetItems(
                "https://www.chickensmoothie.com/pet/123456&trans=1.jpg",
            ),
        ).toBe(true)
        expect(
            hasPetItems(
                "https://www.chickensmoothie.com/pet/123456.jpg?trans=1",
            ),
        ).toBe(true)
        expect(
            hasPetItems("https://www.chickensmoothie.com/pet/123456.jpg&trans"),
        ).toBe(true)
    })

    test("identifies links without trans parameter", () => {
        expect(
            hasPetItems("https://www.chickensmoothie.com/pet/123456.jpg"),
        ).toBe(false)
        expect(
            hasPetItems("https://www.chickensmoothie.com/pet/123456.jpg?k=abc"),
        ).toBe(false)
    })
})

describe("isItemLink", () => {
    test("identifies item links", () => {
        expect(
            isItemLink("https://www.chickensmoothie.com/item/123456.jpg"),
        ).toBe(true)
        expect(
            isItemLink("https://www.chickensmoothie.com/item/123456&p=789.jpg"),
        ).toBe(true)
        expect(isItemLink("https://www.chickencdn.com/item/123456.jpg")).toBe(
            true,
        )
    })

    test("identifies non-item links", () => {
        expect(
            isItemLink("https://www.chickensmoothie.com/pet/123456.jpg"),
        ).toBe(false)
        expect(
            isItemLink("https://www.chickensmoothie.com/forum/123456.jpg"),
        ).toBe(false)
    })
})

describe("hasPetParameter", () => {
    test("identifies links with k parameter", () => {
        expect(
            hasPetParameter(
                "https://www.chickensmoothie.com/pet/123456.jpg?k=abc123",
            ),
        ).toBe(true)
        expect(
            hasPetParameter(
                "https://www.chickensmoothie.com/pet/123456.jpg&k=abc123",
            ),
        ).toBe(true)
        expect(
            hasPetParameter(
                "https://www.chickensmoothie.com/pet/123456.jpg?trans=1&k=abc123",
            ),
        ).toBe(true)
    })

    test("identifies links without k parameter", () => {
        expect(
            hasPetParameter("https://www.chickensmoothie.com/pet/123456.jpg"),
        ).toBe(false)
        expect(
            hasPetParameter(
                "https://www.chickensmoothie.com/pet/123456.jpg?trans=1",
            ),
        ).toBe(false)
    })
})
