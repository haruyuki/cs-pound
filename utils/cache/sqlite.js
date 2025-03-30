import { Sequelize } from "sequelize"

import { CacheStore } from "../database/cache-db.js"

/**
 * SQLite-based cache implementation with TTL support
 */
export class SQLiteCache {
    /**
     * Initialize the cache store
     * @param {number} defaultTTL - Default time to live in milliseconds
     */
    constructor(defaultTTL = 300000) {
        this.defaultTTL = defaultTTL
        // Ensure the cache table exists
        CacheStore.sync()
    }

    /**
     * Set a value in the cache with an optional TTL
     * @param {string} key - The cache key
     * @param {any} value - The value to store
     * @param {number} ttl - Time to live in milliseconds (optional)
     */
    async set(key, value, ttl = this.defaultTTL) {
        const expiresAt = Date.now() + ttl
        await CacheStore.upsert({
            key,
            value: JSON.stringify(value),
            expiresAt,
        })
        return value
    }

    /**
     * Get a value from the cache
     * @param {string} key - The cache key
     * @returns {Promise<any|null>} The cached value or null if not found/expired
     */
    async get(key) {
        const item = await CacheStore.findByPk(key)

        // Return null if item doesn't exist
        if (!item) return null

        // Check if the item has expired
        if (Date.now() > item.expiresAt) {
            await this.delete(key)
            return null
        }

        const parsedValue = JSON.parse(item.value)
        if (parsedValue === null) {
            await this.delete(key)
            return null
        }
        return parsedValue
    }

    /**
     * Check if a key exists in the cache and is not expired
     * @param {string} key - The cache key
     * @returns {Promise<boolean>} True if the key exists and is not expired
     */
    async has(key) {
        const item = await CacheStore.findByPk(key)
        if (!item) return false

        if (Date.now() > item.expiresAt) {
            await this.delete(key)
            return false
        }

        return true
    }

    /**
     * Delete a key from the cache
     * @param {string} key - The cache key
     */
    async delete(key) {
        await CacheStore.destroy({ where: { key } })
    }

    /**
     * Clear all items from the cache
     */
    async clear() {
        await CacheStore.destroy({ where: {} })
    }

    /**
     * Get the number of items in the cache
     * @returns {Promise<number>} The number of items
     */
    async size() {
        return await CacheStore.count()
    }

    /**
     * Clean expired items from the cache
     * @returns {Promise<number>} The number of items removed
     */
    async cleanup() {
        return await CacheStore.destroy({
            where: {
                expiresAt: { [Sequelize.Op.lt]: Date.now() },
            },
        })
    }
}
