import {
    // --- FUNCTIONS ---
    removeOutDir
} from "../../index.js"

/**
 * Clear the outDir directory.
 */
export async function clear(): Promise<void> {
    removeOutDir()
}