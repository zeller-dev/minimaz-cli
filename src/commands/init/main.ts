import {
    copy,
    pathExists
} from "fs-extra"

import {
    createFileFromTemplate,
    getGlobalTemplatePath,
    // --- FUNCTIONS  ---
    log,
    // --- CONSTANTS ---
    minimazConfigTemplate,
    parseBooleanFlag,
    resolveCurrentPath,
} from "../../shared/index.js"

import {
    initGit,
    initNpm
} from "./core.js"

import type {
    InitCommandOptions
} from "./types.js"

/**
 * Initializes a new Minimaz project.
 *
 * @param projectName - Name of the project directory to create
 * @param options - Initialization options (template, npm)
 */
export async function init(
    projectName: string,
    options: InitCommandOptions
): Promise<void> {

    // Resolve targetDir and check if it exists
    const targetDir: string =
        resolveCurrentPath([projectName])

    if (await pathExists(targetDir))
        throw new Error(
            `Target directory "${targetDir}" already exists`
        )

    // Resolve templateDir and check if it exists
    const templateDir: string =
        await getGlobalTemplatePath(options.template)

    // Copy template files to target directory
    log.debug(
        `Copying template from "${templateDir}" to "${targetDir}"`
    )
    await copy(templateDir, targetDir)

    // add minimaz.config.json
    log.debug(
        "Initializing minimaz.config.json"
    )
    await createFileFromTemplate(
        minimazConfigTemplate,
        [targetDir, "minimaz.config.json"],
        false
    )

    // Check for NPM initialization option (ask if not provided)
    const useNpm: boolean =
        parseBooleanFlag(options.npm)

    if (useNpm)
        await initNpm(targetDir, projectName)

    // Check for Git initialization option (ask if not provided)
    const useGit: boolean =
        parseBooleanFlag(options.git)

    if (useGit)
        await initGit(projectName, targetDir, options.gitprovider)

    log.success(
        `Project "${projectName}" created using template "${options.template}"`
    )
}
