import Sequelize, { DataTypes } from "sequelize"

import { DATABASE_CONFIG } from "../../config.js"

/**
 * SQLite database connection using Sequelize ORM
 */
export const sequelize = new Sequelize({
    dialect: "sqlite",
    logging: false,
    storage: DATABASE_CONFIG.CHICKENSMOOTHIE_DB.FILENAME,
    // Performance optimizations
    pool: DATABASE_CONFIG.CHICKENSMOOTHIE_DB.POOL,
    // Disable automatic pluralization of table names
    define: {
        freezeTableName: true,
        timestamps: false,
    },
    // Enable query caching
    dialectOptions: {
        // SQLite specific options
        pragma: {
            cache_size: DATABASE_CONFIG.CHICKENSMOOTHIE_DB.PRAGMA.CACHE_SIZE,
            journal_mode:
                DATABASE_CONFIG.CHICKENSMOOTHIE_DB.PRAGMA.JOURNAL_MODE,
            synchronous: DATABASE_CONFIG.CHICKENSMOOTHIE_DB.PRAGMA.SYNCHRONOUS,
        },
    },
})

// Define models
export const PetDB = sequelize.define(
    "ChickenSmoothiePetArchive",
    {
        petID: {
            type: DataTypes.STRING,
            unique: true,
            primaryKey: true,
        },
        petYear: DataTypes.NUMBER,
        petEvent: DataTypes.STRING,
        petLink: DataTypes.STRING,
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
            type: DataTypes.STRING,
            unique: true,
            primaryKey: true,
        },
        itemRID: {
            type: DataTypes.STRING,
            unique: true,
        },
        itemName: DataTypes.STRING,
        itemYear: DataTypes.NUMBER,
        itemEvent: DataTypes.STRING,
        itemLink: DataTypes.STRING,
    },
    {
        freezeTableName: true,
        timestamps: false,
    },
)
