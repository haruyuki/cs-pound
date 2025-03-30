import Sequelize from "sequelize"

import { DATABASE_CONFIG } from "../../config.js"

/**
 * SQLite database connection for cache using Sequelize ORM
 */
export const cacheSequelize = new Sequelize({
    dialect: "sqlite",
    logging: false,
    storage: DATABASE_CONFIG.CACHE_DB.FILENAME,
    // Performance optimizations
    pool: DATABASE_CONFIG.CACHE_DB.POOL,
    // Disable automatic pluralization of table names
    define: {
        freezeTableName: true,
        timestamps: false,
    },
    // Enable query caching
    dialectOptions: {
        // SQLite specific options
        pragma: {
            cache_size: DATABASE_CONFIG.CACHE_DB.PRAGMA.CACHE_SIZE,
            journal_mode: DATABASE_CONFIG.CACHE_DB.PRAGMA.JOURNAL_MODE,
            synchronous: DATABASE_CONFIG.CACHE_DB.PRAGMA.SYNCHRONOUS,
        },
    },
})
