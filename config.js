import dotenv from "dotenv"

import { getVersion } from "./utils/common/version.js"

dotenv.config()

// Bot information
export const BOT_VERSION = getVersion("2025.03.30")

// File paths
export const COOKIE_FILE_PATH = "./cookies.json"

// Web request settings
export const WEB_REQUEST_CONFIG = {
    // Cache configuration
    CACHE: {
        TYPE: "memory",
        // Cache TTLs (in milliseconds)
        TTL: {
            // 1 minute
            SHORT: 60000,
            // 5 minutes
            GENERAL: 300000,
            // 1 hour
            STATIC: 3600000,
        },
    },
    // Connection pooling settings
    CONNECTION_POOL: {
        MAX_SOCKETS: 10,
        MAX_FREE_SOCKETS: 5,
        // 10 seconds
        TIMEOUT: 10000,
        RETRY_ATTEMPTS: 3,
        // 1 second
        RETRY_DELAY: 1000,
    },
    // HTTP headers
    HEADERS: {
        "User-Agent": `CS Pound Discord Bot Agent ${BOT_VERSION}`,
        From: "haru@haruyuki.moe",
    },
}

// Database settings
export const DATABASE_CONFIG = {
    // MongoDB settings
    MONGODB: {
        URI: process.env.MONGODB_URI,
        DB_NAME: "cs_pound",
        COLLECTIONS: {
            AUTO_REMIND: "auto_remind",
        },
        CONNECTION_POOL: {
            MAX_POOL_SIZE: 10,
            MIN_POOL_SIZE: 5,
            MAX_IDLE_TIME_MS: 30000,
            CONNECT_TIMEOUT_MS: 5000,
            SOCKET_TIMEOUT_MS: 45000,
        },
    },
    // SQLite settings
    CHICKENSMOOTHIE_DB: {
        FILENAME: "chickensmoothie.db",
        POOL: {
            MAX: 5,
            MIN: 0,
            ACQUIRE: 30000,
            IDLE: 10000,
        },
        PRAGMA: {
            // 64MB cache
            CACHE_SIZE: -1024 * 64,
            // Write-Ahead Logging
            JOURNAL_MODE: "WAL",
            // Normal synchronization
            SYNCHRONOUS: 1,
        },
    },
    // Cache database settings
    CACHE_DB: {
        FILENAME: "cache.db",
        POOL: {
            MAX: 5,
            MIN: 0,
            ACQUIRE: 30000,
            IDLE: 10000,
        },
        PRAGMA: {
            CACHE_SIZE: -1024 * 64,
            JOURNAL_MODE: "WAL",
            SYNCHRONOUS: 1,
        },
    },
}

// ChickenSmoothie website settings
export const CS_CONFIG = {
    USERNAME: process.env.CS_USERNAME,
    PASSWORD: process.env.CS_PASSWORD,
    URLS: {
        LOGIN: "https://www.chickensmoothie.com/Forum/ucp.php?mode=login",
        POUND_LAF: "https://www.chickensmoothie.com/poundandlostandfound.php",
        POUND_GROUP:
            "https://www.chickensmoothie.com/accounts/viewgroup.php?userid=2887&groupid=5813&pageSize=3000",
    },
}

// Task scheduling settings
export const TASK_CONFIG = {
    // Opening countdown settings
    OPENING_COUNTDOWN: {
        // minutes
        DEFAULT_CHECK_INTERVAL: 60,
        // 2 seconds between channel notifications
        REMINDER_STAGGER_DELAY: 2000,
        // 1 second between message batches
        MESSAGE_BATCH_DELAY: 1000,
        MAX_MENTIONS_PER_MESSAGE: 50,
    },
}

// Discord settings
export const DISCORD_CONFIG = {
    TOKEN: process.env.DISCORD_TOKEN,
    INTENTS: ["Guilds"],
    PRESENCE: {
        ACTIVITY_TYPE: "Playing",
        ACTIVITY_NAME: "Need help? https://support.haruyuki.moe",
    },
}

// CAPTCHA solving settings
export const CAPTCHA_CONFIG = {
    API_KEY: process.env.CAPTCHA_API_KEY,
}
