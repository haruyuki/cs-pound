// Mock implementation of axios
const mockGet = jest.fn()
const mockPost = jest.fn()

const axios = {
    create: jest.fn(() => ({
        get: mockGet,
        post: mockPost,
    })),
    get: mockGet,
    post: mockPost,
}

export default axios
