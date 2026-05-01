import {
    // --- COMMANDS ---
    config,

    // --- FUNCTIONS ---
    log
} from "../index.js"

/**
 * Post-install hook.
 *
 * Ensures default templates/configuration are initialized
 * after package installation.
 *
 * This is typically executed automatically (e.g. via npm/yarn lifecycle).
 * Safe to run multiple times if `config(false)` is idempotent.
 *
 * @returns {Promise<void>}
 */
export async function postInstall(): Promise<void> {
    try {
        log("info", "Running post-install setup...")

        // Initialize default configuration/templates without forcing overwrite
        await config(false)

        log("success", "Post-install setup completed")
    } catch (error: any) {
        // Log failure with error context for debugging
        log("error", `Post-install setup failed: ${error?.message}`)
    }
}