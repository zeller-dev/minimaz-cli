import { homedir } from "os"
import path from "path"
import { getGlobalNodeModulesPath, getNodeModulesTemplatesPath } from "../utils/functions.js"
import { log } from "../utils/logService.js"
import fs from 'fs-extra'


/**
 * Ensures the global Minimaz directory structure exists.
 *
 * Creates:
 * - ~/.minimaz
 * - ~/.minimaz/templates
 * - ~/.minimaz/settings.json
 *
 * Copies default templates if the templates folder is empty.
 */
export async function createGlobalDir(): Promise<void> {
    // Creating dir if it does not exist
    const minimazDir: string = path.join(homedir(), '.minimaz')
    await fs.ensureDir(minimazDir)

    const globalTemplatesDir = path.join(minimazDir, 'templates')
    const defaultTemplatesDir: string = await getNodeModulesTemplatesPath()
    const settingsPath: string = path.join(minimazDir, 'settings.json')

    try {
        if (!await fs.pathExists(settingsPath)) {
            await fs.outputJson(
                settingsPath,
                {
                    createdAt: new Date().toISOString(),
                    templatesPath: globalTemplatesDir,
                    npmGlobalPath: await getGlobalNodeModulesPath()
                },
                { spaces: 2 }
            )
            log('success', `Created settings.json at ${settingsPath}`)
        }

        const exists: boolean = await fs.pathExists(globalTemplatesDir)
        const isEmpty: boolean = exists ? (await fs.readdir(globalTemplatesDir)).length === 0 : true

        if (!exists) {
            await fs.ensureDir(globalTemplatesDir)
            log('success', 'Created global templates directory.')
        }

        if (!isEmpty) {
            log('debug', 'Global templates directory not empty. Skipping copy.')
            return
        }

        if (await fs.pathExists(defaultTemplatesDir)) {
            for (const name of await fs.readdir(defaultTemplatesDir)) {
                await fs.copy(path.join(defaultTemplatesDir, name), path.join(globalTemplatesDir, name))
                log('success', `Copied template '${name}'.`)
            }
        } else {
            log('warn', 'Default templates directory not found.')
        }

        log('success', 'Default templates setup completed.')
    } catch (error: any) {
        log('error', `Failed to create global templates directory: ${error.message}`)
        throw error
    }
}