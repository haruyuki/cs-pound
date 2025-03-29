import { performance } from "node:perf_hooks"
import { MongoClient } from "mongodb"
import Sequelize, { NUMBER, STRING } from "sequelize"

import { DATABASE_CONFIG } from "../config.js"
import { Logger } from "./logger.js"

// MongoDB setup
export let POUND_REMIND_TIMES = []
export let LAF_REMIND_TIMES = []

// Configure MongoDB with connection pooling
const client = new MongoClient(DATABASE_CONFIG.MONGODB.URI, {
    maxPoolSize: DATABASE_CONFIG.MONGODB.CONNECTION_POOL.MAX_POOL_SIZE,
    minPoolSize: DATABASE_CONFIG.MONGODB.CONNECTION_POOL.MIN_POOL_SIZE,
    maxIdleTimeMS: DATABASE_CONFIG.MONGODB.CONNECTION_POOL.MAX_IDLE_TIME_MS,
    connectTimeoutMS:
        DATABASE_CONFIG.MONGODB.CONNECTION_POOL.CONNECT_TIMEOUT_MS,
    socketTimeoutMS: DATABASE_CONFIG.MONGODB.CONNECTION_POOL.SOCKET_TIMEOUT_MS,
})

// Initialize MongoDB connection
let database
let collection

// Connect to MongoDB asynchronously
async function connectToMongoDB() {
    try {
        const startTime = performance.now()
        await client.connect()
        database = client.db(DATABASE_CONFIG.MONGODB.DB_NAME)
        collection = database.collection(
            DATABASE_CONFIG.MONGODB.COLLECTIONS.AUTO_REMIND,
        )
        const endTime = performance.now()
        Logger.success(
            `Connected to MongoDB (${Math.round(endTime - startTime)}ms)`,
        )
        return true
    } catch (error) {
        Logger.error(`MongoDB connection error: ${error.message}`)
        return false
    }
}

// Initialize connection
connectToMongoDB()

// SQLite setup
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

// Function to update auto-remind times from MongoDB
export const updateAutoRemindTimes = async () => {
    try {
        const startTime = performance.now()

        // Ensure we have a valid MongoDB connection
        if (!client.db) {
            Logger.warn("MongoDB connection lost, attempting to reconnect...")
            await connectToMongoDB()
        }

        // Execute both queries in parallel for better performance
        const [poundTimes, lafTimes] = await Promise.all([
            collection.distinct("pound"),
            collection.distinct("laf"),
        ])

        // Update the global variables
        POUND_REMIND_TIMES = poundTimes
        LAF_REMIND_TIMES = lafTimes

        const endTime = performance.now()
        Logger.debug(
            `Updated auto-remind times (${Math.round(endTime - startTime)}ms)`,
        )
    } catch (error) {
        Logger.error(`Error updating auto-remind times: ${error.message}`)
        // Return default values in case of error
        POUND_REMIND_TIMES = []
        LAF_REMIND_TIMES = []
    }
}

// Function to get auto-remind documents
export const getAutoRemindDocuments = async (time, openingType) => {
    try {
        const startTime = performance.now()

        // Ensure we have a valid MongoDB connection
        if (!client.db) {
            Logger.warn("MongoDB connection lost, attempting to reconnect...")
            await connectToMongoDB()
        }

        // Create a more efficient query with proper indexing
        let query
        if (openingType === "pound") {
            query = { pound: time }
        } else if (openingType === "lost and found") {
            query = { laf: time }
        } else {
            return []
        }

        // Only retrieve the fields we need to reduce data transfer
        const projection = { user_id: 1, channel_id: 1, _id: 0 }

        // Execute the query with the projection
        const results = await collection
            .find(query)
            .project(projection)
            .toArray()

        const endTime = performance.now()
        Logger.debug(
            `Retrieved ${results.length} auto-remind documents for ${openingType}:${time} (${Math.round(endTime - startTime)}ms)`,
        )

        return results
    } catch (error) {
        Logger.error(`Error retrieving auto-remind documents: ${error.message}`)
        return []
    }
}
