import fs from 'fs-extra'
import path from 'node:path'

import {
    homedir
} from 'node:os'

import {
    // --- FUNCTIONS ---
    createFileFromTemplate, getNodeModulesTemplatesPath, getSettingsTemplate, log,

    // --- TYPES ---
    Settings
} from '../index.js'

export async function config(overwrite: boolean): Promise<void> {

    log('debug', '' + overwrite)

    // ~/.minimaz directory
    const globalDir: string = path.join(homedir(), '.minimaz')
    if (await fs.pathExists(globalDir))
        log('info', '~/.minimaz already exists. Skipping...')
    else
        await createGlobalDir()

    // /node_modules/minimaz-cli/templates
    const defaultTemplatesDir: string =
        await getNodeModulesTemplatesPath()
    if (!(await fs.pathExists(defaultTemplatesDir))) {
        log('error', 'Default templates directory not found.')
        return
    }

    // ~/.minimaz/templates directory
    const globalTemplatesDir: string =
        path.join(globalDir, 'templates')
    if (await fs.pathExists(globalTemplatesDir))
        log('info', '~/.minimaz/templates already exists, skipping.')
    else
        await createGlobalTemplatesDir()

    // Copy default templates (respects overwrite flag)
    await copyDefaultTemplates()

    // ~/.minimaz/settings.json
    const settingsPath: string =
        path.join(globalDir, 'settings.json')
    await createSettings()  // always enter settings function to validate/fix


    // --------------------
    // --- Helper functions
    // --------------------

    async function createGlobalDir(): Promise<void> {
        log('info', '~/.minimaz doesn\'t exist. Generating...')
        await fs.ensureDir(globalDir)
    }

    async function createGlobalTemplatesDir(): Promise<void> {
        await fs.ensureDir(globalTemplatesDir)
        log('success', `Templates directory created at ${globalTemplatesDir}`)
    }

    async function copyDefaultTemplates() {
        log('info', 'Checking default templates...')

        const defaultTemplates = await fs.readdir(defaultTemplatesDir)
        if (defaultTemplates.length === 0) {
            log('warn', 'No default templates available')
            return
        }

        for (
            const name
            of defaultTemplates
        ) {
            const src: string =
                path.join(defaultTemplatesDir, name)
            const dest: string =
                path.join(globalTemplatesDir, name)
            const exist: boolean =
                await fs.pathExists(dest)

            if (exist && !overwrite) {
                log('info', `Template '${name}' already exists. Skipping...`)
                continue
            }

            await fs.copy(src, dest, { overwrite })

            if (exist && overwrite)
                log('success', `Template '${name}' overwritten.`);
            else
                log('success', `Template '${name}' copied.`);

        }
    }

    async function createSettings(): Promise<void> {
        const template: Settings =
            await getSettingsTemplate(globalTemplatesDir)

        // If file doesn't exist or overwrite = true → write template directly
        if (!(await fs.pathExists(settingsPath)) || overwrite) {
            await createFileFromTemplate(template, [settingsPath])
            if (overwrite && await fs.pathExists(settingsPath))
                log('success', `Overwritten settings.json at ${settingsPath}`)
            else
                log('success', `Created settings.json at ${settingsPath}`)
            return
        }

        // File exists → read and validate
        let currentSettings: Partial<Settings>
        try {
            currentSettings =
                await fs.readJson(settingsPath)
        } catch (err: any) {
            log(
                'warn',
                'Failed to read settings.json. Recreating from template...'
            )
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
                log('warn', `Added missing key '${key}' to settings.json`)
                updated = true
            }
        }

        // Warn about unknown keys
        for (
            const key
            of Object.keys(currentSettings) as (keyof typeof currentSettings)[]
        ) {
            if (!(key in template))
                log('warn', `Unknown key '${key}' found in settings.json`)
        }

        if (updated) {
            await createFileFromTemplate(currentSettings, [settingsPath])
            log('success', `Updated settings.json to match template`)
        } else {
            log('info', 'settings.json is valid and up-to-date')
        }
    }
}