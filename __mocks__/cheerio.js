// Mock implementation of cheerio
const mockCheerioObject = {
    find: jest.fn().mockReturnValue({
        length: 0,
        find: jest.fn().mockReturnValue({ length: 0 }),
        each: jest.fn(),
    }),
    text: jest.fn(),
    val: jest.fn(),
}

export const load = jest.fn().mockReturnValue(mockCheerioObject)

export default {
    load,
}
