import { MemoryCache } from "../utils/cache/memory.js"
import {
    CacheType,
    getMemoryCache,
    getSQLiteCache,
} from "../utils/cache/singleton.js"
import { SQLiteCache } from "../utils/cache/sqlite.js"
import { Logger } from "../utils/common/logger.js"

/**
 * Sets up automatic cleanup for the cache instance
 * @param {MemoryCache|SQLiteCache|string} cacheOrType - The cache instance or cache type to clean
 * @param {number} interval - Cleanup interval in milliseconds
 * @returns {number} The interval timer
 */
export function setupAutomaticCleanup(cacheOrType, interval = 300000) {
    // Default: 5 minutes
    let cache = cacheOrType

    // If a cache type string was provided, get the appropriate singleton instance
    if (typeof cacheOrType === "string") {
        if (cacheOrType === CacheType.MEMORY) {
            cache = getMemoryCache()
        } else if (cacheOrType === CacheType.SQLITE) {
            cache = getSQLiteCache()
        }
    }

    return setInterval(async () => {
        if (cache instanceof MemoryCache) {
            const removed = cache.cleanup()
            if (removed > 0) {
                Logger.info(
                    `Memory cache cleanup: removed ${removed} expired items`,
                )
            }
        } else if (cache instanceof SQLiteCache) {
            const removed = await cache.cleanup()
            if (removed > 0) {
                Logger.info(
                    `SQLite cache cleanup: removed ${removed} expired items`,
                )
            }
        }
    }, interval)
}
