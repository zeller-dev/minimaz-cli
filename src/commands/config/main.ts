import { join } from "node:path"
import { homedir } from "node:os"
import { pathExists } from "fs-extra"
import { getNodeModulesTemplatesPath, log } from "../../index.js"

// Import logic from core
import {
    setupGlobalDir,
    setupGlobalTemplatesDir,
    copyDefaultTemplates,
    createSettings
} from "./core.js"

export async function config(
    overwrite: boolean
): Promise<void> {
    log("debug", `${overwrite}`)

    // 1. ~/.minimaz directory
    const globalDir: string = join(homedir(), ".minimaz")
    await setupGlobalDir(globalDir)

    // 2. /node_modules/minimaz-cli/templates
    const defaultTemplatesDir: string = await getNodeModulesTemplatesPath()
    if (!(await pathExists(defaultTemplatesDir))) {
        log("error", "Default templates directory not found.")
        return // Early exit if we can't find source templates
    }

    // 3. ~/.minimaz/templates directory
    const globalTemplatesDir: string = join(globalDir, "templates")
    await setupGlobalTemplatesDir(globalTemplatesDir)

    // 4. Copy default templates
    await copyDefaultTemplates(defaultTemplatesDir, globalTemplatesDir, overwrite)

    // 5. ~/.minimaz/settings.json
    const settingsPath: string = join(globalDir, "settings.json")
    await createSettings(settingsPath, globalTemplatesDir, overwrite)
}