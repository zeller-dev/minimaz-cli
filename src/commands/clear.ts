import { removeDistDir } from '../index.js'

/**
 * Clear the dist directory.
 */
export async function clear(): Promise<void> {
    removeDistDir()
}