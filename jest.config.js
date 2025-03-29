/** @type {import('jest').Config} */
export default {
    // Automatically clear mock calls, instances, contexts and results before every test
    clearMocks: true,

    // Indicates whether the coverage information should be collected while executing the test
    collectCoverage: true,

    // The directory where Jest should output its coverage files
    coverageDirectory: "coverage",

    // Indicates which provider should be used to instrument code for coverage
    coverageProvider: "v8",

    // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },

    // A map from regular expressions to paths to transformers
    transform: {
        "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { rootMode: "upward" }],
    },

    // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
    transformIgnorePatterns: ["/node_modules/(?!node-fetch)"],

    // Tell Jest to use the Node.js environment
    testEnvironment: "node",
}
