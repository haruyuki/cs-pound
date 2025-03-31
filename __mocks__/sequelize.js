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

// Export DataTypes object to match Sequelize's structure
export const DataTypes = {
    STRING: Sequelize.STRING,
    TEXT: Sequelize.TEXT,
    NUMBER: Sequelize.NUMBER,
    BIGINT: Sequelize.NUMBER,
}

export default Sequelize
