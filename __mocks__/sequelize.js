// Mock implementation of Sequelize
const mockModel = {
    sync: jest.fn().mockResolvedValue({}),
    findByPk: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue([{}, true]),
    destroy: jest.fn().mockResolvedValue(0),
    count: jest.fn().mockResolvedValue(0),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue([0]),
    bulkCreate: jest.fn().mockResolvedValue([]),
}

// Mock Sequelize constructor
const Sequelize = jest.fn().mockImplementation(() => ({
    authenticate: jest.fn().mockResolvedValue(),
    define: jest.fn().mockReturnValue(mockModel),
    transaction: jest.fn().mockImplementation((callback) => {
        if (callback) {
            return callback({ commit: jest.fn(), rollback: jest.fn() })
        }
        return {
            commit: jest.fn(),
            rollback: jest.fn(),
        }
    }),
    close: jest.fn().mockResolvedValue(),
    sync: jest.fn().mockResolvedValue(),
    literal: jest.fn().mockReturnValue(""),
    query: jest.fn().mockResolvedValue([]),
    Op: {
        eq: Symbol("eq"),
        ne: Symbol("ne"),
        gte: Symbol("gte"),
        gt: Symbol("gt"),
        lte: Symbol("lte"),
        lt: Symbol("lt"),
        in: Symbol("in"),
        notIn: Symbol("notIn"),
        like: Symbol("like"),
        notLike: Symbol("notLike"),
        between: Symbol("between"),
        notBetween: Symbol("notBetween"),
        and: Symbol("and"),
        or: Symbol("or"),
    },
    options: {
        hooks: {},
    },
}))

// Mock data types
Sequelize.STRING = "STRING"
Sequelize.TEXT = "TEXT"
Sequelize.NUMBER = "NUMBER"
Sequelize.INTEGER = "INTEGER"
Sequelize.FLOAT = "FLOAT"
Sequelize.BOOLEAN = "BOOLEAN"
Sequelize.DATE = "DATE"
Sequelize.JSON = "JSON"
Sequelize.JSONB = "JSONB"
Sequelize.BLOB = "BLOB"
Sequelize.UUID = "UUID"
Sequelize.UUIDV4 = "UUIDV4"
Sequelize.ARRAY = jest.fn().mockReturnValue("ARRAY")

// Export data types as named exports
export const STRING = Sequelize.STRING
export const TEXT = Sequelize.TEXT
export const NUMBER = Sequelize.NUMBER
export const INTEGER = Sequelize.INTEGER
export const FLOAT = Sequelize.FLOAT
export const BOOLEAN = Sequelize.BOOLEAN
export const DATE = Sequelize.DATE
export const JSON = Sequelize.JSON
export const JSONB = Sequelize.JSONB
export const BLOB = Sequelize.BLOB
export const UUID = Sequelize.UUID
export const UUIDV4 = Sequelize.UUIDV4
export const ARRAY = Sequelize.ARRAY

// Mock Model class
export class Model {
    static init() {}
    static sync() {}
    static findByPk() {}
    static findAll() {}
    static findOne() {}
    static create() {}
    static update() {}
    static destroy() {}
    static count() {}
    static upsert() {}
    static bulkCreate() {}
}

// Set Model as a property of Sequelize
Sequelize.Model = Model

export default Sequelize
