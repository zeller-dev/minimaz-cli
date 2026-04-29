import {
    // --- FUNCTIONS ---
    removeOutDir
} from "../index.js"

/**
 * Clear the dist directory.
 */
export async function clear(): Promise<void> {
    removeOutDir()
}