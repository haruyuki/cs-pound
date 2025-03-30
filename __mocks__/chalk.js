// Mock implementation of chalk
const chalk = {
    // Basic colors
    blue: jest.fn((text) => text),
    yellow: jest.fn((text) => text),
    red: {
        bold: jest.fn((text) => text),
    },
    green: jest.fn((text) => text),
    magenta: jest.fn((text) => text),
    white: jest.fn((text) => text),
    // Add any other chalk methods used in your codebase
}

export default chalk
