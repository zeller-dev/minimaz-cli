import {
    join,
    pathExists
} from "../../shared/fs/index.js"

import {
    homedir
} from "node:os"

import {
    // --- CONSTANTS ---
    defaults,

    // --- FUNCTIONS ---
    getNodeModulesTemplatesPath,
} from "../../shared/index.js"

import {
    log,
} from "../../shared/logger/index.js"

import {
    copyDefaultTemplates,
    createSettings,
    setupGlobalDir,
    setupGlobalTemplatesDir
} from "./core.js"

/**
 * Initializes or updates the global Minimaz configuration.
 *
 * This function is responsible for ensuring that the user's
 * global CLI environment exists and is consistent.
 *
 * Steps:
 * 1. Create global directory
 * 2. Resolve default templates from node_modules
 * 3. Create global templates directory
 * 4. Copy default templates (optionally overwriting)
 * 5. Create or update settings.json
 *
 * @param {boolean} overwrite - If true, existing templates/settings are replaced
 */
export async function config(
    overwrite: boolean
): Promise<void> {
    log.debug(
        `Config initialization (overwrite=${overwrite})`
    )

    /**
     * 1. Global root directory
     * Stores all CLI-related persistent data.
     */
    const globalDir: string =
        join(homedir(), defaults.globalDir)
    await setupGlobalDir(globalDir)

    /**
     * 2. Default templates source (from installed package)
     * Required for bootstrapping user templates.
     */
    const defaultTemplatesDir: string =
        await getNodeModulesTemplatesPath()

    if (!(await pathExists(defaultTemplatesDir))) {
        log.error(
            "Default templates directory not found"
        )
        return // Cannot proceed without base templates
    }

    /**
     * 3. Global templates directory
     * User-level template storage.
     */
    const globalTemplatesDir: string =
        join(globalDir, "templates")
    await setupGlobalTemplatesDir(globalTemplatesDir)

    /**
     * 4. Copy default templates into user space
     * Controlled by overwrite flag.
     */
    await copyDefaultTemplates(
        defaultTemplatesDir,
        globalTemplatesDir,
        overwrite
    )

    /**
     * 5. Global settings file
     * Ensures CLI configuration exists and is up to date.
     */
    const settingsPath: string =
        join(globalDir, "settings.json")

    await createSettings(
        settingsPath,
        globalTemplatesDir,
        overwrite
    )
}