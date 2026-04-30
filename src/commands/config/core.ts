import { copy, ensureDir, pathExists } from "fs-extra"
import { readdir } from "node:fs/promises"
import { join } from "node:path"
import {
    createFileFromTemplate,
    getSettingsTemplate,
    log,
    readJsonFile,
    Settings
} from "../../index.js"

export async function setupGlobalDir(
    globalDir: string
): Promise<void> {
    if (await pathExists(globalDir)) {
        log("info", "~/.minimaz already exists. Skipping...")
    } else {
        log("info", "~/.minimaz does not exist. Generating...")
        await ensureDir(globalDir)
    }
}

export async function setupGlobalTemplatesDir(
    globalTemplatesDir: string
): Promise<void> {
    if (await pathExists(globalTemplatesDir)) {
        log("info", "~/.minimaz/templates already exists, skipping.")
    } else {
        await ensureDir(globalTemplatesDir)
        log("success", `Templates directory created at ${globalTemplatesDir}`)
    }
}

export async function copyDefaultTemplates(
    defaultTemplatesDir: string,
    globalTemplatesDir: string,
    overwrite: boolean
): Promise<void> {
    log("info", "Checking default templates...")

    const defaultTemplates = await readdir(defaultTemplatesDir)
    if (defaultTemplates.length === 0) {
        log("warn", "No default templates available")
        return
    }

    for (
        const name
        of defaultTemplates
    ) {
        const src: string = join(defaultTemplatesDir, name)
        const dest: string = join(globalTemplatesDir, name)
        const exist: boolean = await pathExists(dest)

        if (exist && !overwrite) {
            log("info", `Template "${name}" already exists. Skipping...`)
            continue
        }

        await copy(src, dest, { overwrite })

        if (exist && overwrite)
            log("success", `Template "${name}" overwritten.`)
        else
            log("success", `Template "${name}" copied.`)
    }
}

export async function createSettings(
    settingsPath: string,
    globalTemplatesDir: string,
    overwrite: boolean
): Promise<void> {
    const template: Settings = await getSettingsTemplate(globalTemplatesDir)

    // If file does not exist or overwrite = true → write template directly
    if (!(await pathExists(settingsPath)) || overwrite) {
        await createFileFromTemplate(template, [settingsPath])
        if (overwrite && await pathExists(settingsPath))
            log("success", `Overwritten settings.json at ${settingsPath}`)
        else
            log("success", `Created settings.json at ${settingsPath}`)
        return
    }

    // File exists → read and validate
    let currentSettings: Partial<Settings>
    try {
        currentSettings = await readJsonFile(settingsPath)
    } catch (err: any) {
        log("warn", "Failed to read settings.json. Recreating from template...")
        await createFileFromTemplate(template, [settingsPath])
        return
    }

    let updated = false

    // Ensure all required keys exist
    for (
        const key
        of Object.keys(template) as (keyof Settings)[]
    ) {
        if (!(key in currentSettings)) {
            currentSettings[key] = template[key]
            log("warn", `Added missing key "${key}" to settings.json`)
            updated = true
        }
    }

    // Warn about unknown keys
    for (
        const key
        of Object.keys(currentSettings) as (keyof typeof currentSettings)[]
    ) {
        if (!(key in template))
            log("warn", `Unknown key "${key}" found in settings.json`)
    }

    if (updated) {
        await createFileFromTemplate(currentSettings, [settingsPath])
        log("success", `Updated settings.json to match template`)
    } else {
        log("info", "settings.json is valid and up-to-date")
    }
}