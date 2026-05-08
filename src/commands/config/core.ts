import {
    copy,
    ensureDir,
    getDirElements,
    join,
    pathExists, readJsonFile
} from "../../shared/fs/index.js"

import {
    log
} from "../../shared/logger/index.js"

import {
    createFileFromTemplate,
    defaults,
    getSettingsTemplate
} from "../../shared/index.js"

import type {
    Settings
} from "../../shared/index.js"

/**
 * Ensures the global Minimaz directory exists.
 *
 * This directory acts as the root for user-scoped configuration
 * and templates
 */
export async function setupGlobalDir(
    globalDir: string
): Promise<void> {
    if (await pathExists(globalDir)) {
        log.info(
            `~/${defaults.globalDir} already exists. Skipping`
        )
        return
    }

    log.info(
        `~/${defaults.globalDir} does not exist. Generating`
    )
    await ensureDir(globalDir)
}

/**
 * Ensures the global templates directory exists.
 *
 * This directory stores reusable project templates.
 */
export async function setupGlobalTemplatesDir(
    globalTemplatesDir: string
): Promise<void> {
    if (await pathExists(globalTemplatesDir)) {
        log.info(
            `~/${defaults.globalDir}/templates already exists, skipping`
        )
        return
    }

    await ensureDir(globalTemplatesDir)
    log.success(
        `Templates directory created at ${globalTemplatesDir}`
    )
}

/**
 * Copies default templates into the global templates directory.
 *
 * Behavior:
 * - Skips existing templates unless overwrite = true
 * - Copies all files from defaultTemplatesDir to globalTemplatesDir
 */
export async function copyDefaultTemplates(
    defaultTemplatesDir: string,
    globalTemplatesDir: string,
    overwrite: boolean
): Promise<void> {
    log.info(
        "Checking default templates"
    )

    const defaultTemplates: string[] =
        await getDirElements(defaultTemplatesDir)

    if (defaultTemplates.length === 0) {
        log.warn(
            "No default templates available"
        )
        return
    }

    for (
        const name
        of defaultTemplates
    ) {
        const src: string =
            join(defaultTemplatesDir, name)
        const dest: string =
            join(globalTemplatesDir, name)

        const exists: boolean =
            await pathExists(dest)

        if (exists && !overwrite) {
            log.info(
                `Template "${name}" already exists. Skipping`
            )
            continue
        }

        await copy(src, dest, overwrite)

        if (exists && overwrite) {
            log.success(
                `Template "${name}" overwritten`
            )
        } else {
            log.success(
                `Template "${name}" copied`
            )
        }
    }
}

/**
 * Creates or updates the global settings file.
 *
 * Logic:
 * - If settings do not exist → create from template
 * - If overwrite = true → replace entirely
 * - If exists → merge missing keys and warn about unknown keys
 *
 * Ensures backward compatibility when settings schema evolves.
 */
export async function createSettings(
    settingsPath: string,
    globalTemplatesDir: string,
    overwrite: boolean
): Promise<void> {
    const template: Settings =
        getSettingsTemplate(globalTemplatesDir)

    // Fresh creation or forced overwrite
    if (
        !(await pathExists(settingsPath))
        || overwrite
    ) {
        await createFileFromTemplate(
            template,
            [settingsPath]
        )

        if (
            await pathExists(settingsPath)
            && overwrite
        ) {
            log.success(
                `Overwritten settings.json at ${settingsPath}`
            )
        } else {
            log.success(
                `Created settings.json at ${settingsPath}`
            )
        }

        return
    }

    // Existing file → validate and patch
    let currentSettings: Partial<Settings>

    try {
        currentSettings =
            await readJsonFile(settingsPath)
    } catch {
        log.warn(
            "Failed to read settings.json. Recreating from template"
        )
        await createFileFromTemplate(
            template,
            [settingsPath]
        )
        return
    }

    let updated: boolean = false

    // Add missing keys from template (forward compatibility)
    for (
        const key
        of Object.keys(template) as (keyof Settings)[]
    ) {
        if (!(key in currentSettings)) {
            currentSettings[key] =
                template[key]
            log.warn(
                `Added missing key "${key}" to settings.json`
            )
            updated = true
        }
    }

    // Detect unknown/legacy keys (no automatic removal)
    for (
        const key
        of Object.keys(currentSettings) as (keyof typeof currentSettings)[]
    ) {
        if (!(key in template)) {
            log.warn(
                `Unknown key "${key}" found in settings.json`
            )
        }
    }

    if (updated) {
        await createFileFromTemplate(
            currentSettings,
            [settingsPath]
        )

        log.success(
            "Updated settings.json"
        )
    } else {
        log.info(
            "settings.json is valid and up-to-date"
        )
    }
}