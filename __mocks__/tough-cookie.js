// Mock implementation of tough-cookie
export const CookieJar = jest.fn().mockImplementation(() => ({
    serializeSync: jest.fn().mockReturnValue({ cookies: [] }),
    getCookieStringSync: jest.fn().mockReturnValue(""),
}))

CookieJar.deserializeSync = jest.fn().mockReturnValue(new CookieJar())

export default {
    CookieJar,
}
