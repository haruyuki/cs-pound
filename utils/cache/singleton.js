import { MemoryCache } from "./memory.js"
import { SQLiteCache } from "./sqlite.js"

/**
 * Cache type enumeration
 */
export const CacheType = {
    MEMORY: "memory",
    SQLITE: "sqlite",
}

// Singleton instances for each cache type
let memoryCacheInstance = null
let sqliteCacheInstance = null

/**
 * Get or create a singleton instance of MemoryCache
 * @param {number} defaultTTL - Default time-to-live in milliseconds
 * @returns {MemoryCache} The singleton memory cache instance
 */
export function getMemoryCache(defaultTTL = 600000) {
    if (!memoryCacheInstance) {
        memoryCacheInstance = new MemoryCache(defaultTTL)
    }
    return memoryCacheInstance
}

/**
 * Get or create a singleton instance of SQLiteCache
 * @param {number} defaultTTL - Default time-to-live in milliseconds
 * @returns {SQLiteCache} The singleton SQLite cache instance
 */
export function getSQLiteCache(defaultTTL = 3600000) {
    if (!sqliteCacheInstance) {
        sqliteCacheInstance = new SQLiteCache(defaultTTL)
    }
    return sqliteCacheInstance
}

/**
 * Creates and returns a cache instance based on the TTL duration
 * @param {number} defaultTTL - Default time-to-live in milliseconds
 * @returns {MemoryCache|SQLiteCache} The cache instance
 */
export function createCache(defaultTTL = 600000) {
    // Use SQLite for long-term caching (TTL > 1 hour)
    // Use Memory cache for short-term caching (TTL <= 1 hour)
    const ONE_HOUR = 30 * 60 * 1000

    return defaultTTL > ONE_HOUR
        ? getSQLiteCache(defaultTTL)
        : getMemoryCache(defaultTTL)
}
