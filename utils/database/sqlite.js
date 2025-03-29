import Sequelize, { NUMBER, STRING } from "sequelize"

import { DATABASE_CONFIG } from "../../config.js"

/**
 * SQLite database connection using Sequelize ORM
 */
export const sequelize = new Sequelize({
    dialect: "sqlite",
    logging: false,
    storage: DATABASE_CONFIG.SQLITE.FILENAME,
    // Performance optimizations
    pool: DATABASE_CONFIG.SQLITE.POOL,
    // Disable automatic pluralization of table names
    define: {
        freezeTableName: true,
        timestamps: false,
    },
    // Enable query caching
    dialectOptions: {
        // SQLite specific options
        pragma: {
            cache_size: DATABASE_CONFIG.SQLITE.PRAGMA.CACHE_SIZE,
            journal_mode: DATABASE_CONFIG.SQLITE.PRAGMA.JOURNAL_MODE,
            synchronous: DATABASE_CONFIG.SQLITE.PRAGMA.SYNCHRONOUS,
        },
    },
})

// Define models
export const PetDB = sequelize.define(
    "ChickenSmoothiePetArchive",
    {
        petID: {
            type: STRING,
            unique: true,
            primaryKey: true,
        },
        petYear: NUMBER,
        petEvent: STRING,
        petLink: STRING,
    },
    {
        freezeTableName: true,
        timestamps: false,
    },
)

export const ItemDB = sequelize.define(
    "ChickenSmoothieItemArchive",
    {
        itemLID: {
            type: STRING,
            unique: true,
            primaryKey: true,
        },
        itemRID: {
            type: STRING,
            unique: true,
        },
        itemName: STRING,
        itemYear: NUMBER,
        itemEvent: STRING,
        itemLink: STRING,
    },
    {
        freezeTableName: true,
        timestamps: false,
    },
)
