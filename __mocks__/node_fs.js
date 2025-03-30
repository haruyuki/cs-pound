// Mock implementation of node:fs
export const existsSync = jest.fn()
export const readFileSync = jest.fn()
export const writeFileSync = jest.fn()

export default {
    existsSync,
    readFileSync,
    writeFileSync,
}
