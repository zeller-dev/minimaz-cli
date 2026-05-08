import {
    removeOutDir
} from "../../shared/index.js"

/**
 * Removes the configured output directory.
 *
 * This is a thin wrapper around `removeOutDir` intended to expose
 * a semantic "clear" operation for higher-level workflows.
 *
 * @returns {Promise<void>}
 */
export async function clear(): Promise<void> {
    // Delegates to core cleanup utility
    await removeOutDir()
}