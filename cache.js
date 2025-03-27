/**
 * Simple in-memory cache implementation with TTL support
 */
export class Cache {
    constructor(defaultTTL = 300000) {
        // Default TTL: 5 minutes (in milliseconds)
        this.cache = new Map()
        this.defaultTTL = defaultTTL
    }

    /**
     * Set a value in the cache with an optional TTL
     * @param {string} key - The cache key
     * @param {any} value - The value to store
     * @param {number} ttl - Time to live in milliseconds (optional)
     */
    set(key, value, ttl = this.defaultTTL) {
        const expiresAt = Date.now() + ttl
        this.cache.set(key, {
            value,
            expiresAt,
        })
        return value
    }

    /**
     * Get a value from the cache
     * @param {string} key - The cache key
     * @returns {any|null} The cached value or null if not found/expired
     */
    get(key) {
        const item = this.cache.get(key)

        // Return null if item doesn't exist
        if (!item) return null

        // Check if the item has expired
        if (Date.now() > item.expiresAt) {
            this.delete(key)
            return null
        }

        return item.value
    }

    /**
     * Check if a key exists in the cache and is not expired
     * @param {string} key - The cache key
     * @returns {boolean} True if the key exists and is not expired
     */
    has(key) {
        const item = this.cache.get(key)
        if (!item) return false

        if (Date.now() > item.expiresAt) {
            this.delete(key)
            return false
        }

        return true
    }

    /**
     * Delete a key from the cache
     * @param {string} key - The cache key
     */
    delete(key) {
        this.cache.delete(key)
    }

    /**
     * Clear all items from the cache
     */
    clear() {
        this.cache.clear()
    }

    /**
     * Get the number of items in the cache
     * @returns {number} The number of items
     */
    size() {
        return this.cache.size
    }

    /**
     * Clean expired items from the cache
     * @returns {number} The number of items removed
     */
    cleanup() {
        const now = Date.now()
        let count = 0

        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiresAt) {
                this.cache.delete(key)
                count++
            }
        }

        return count
    }
}
