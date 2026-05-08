import {
    basename,
    copy,
    ensureDir,
    getDirElements,
    join,
    pathExists,
    remove,
} from "../../shared/fs/index.js"

import {
    log
} from "../../shared/logger/index.js"

import {
    askQuestion,
    getNodeModulesTemplatesPath,
    resolveCurrentPath
} from "../../shared/index.js"


/**
 * Updates a single template with files from the current working directory.
 *
 * @param dir - Global templates directory
 * @param templateName - Name of the template to update
 */
export async function updateSingleTemplate(
    dir: string,
    name: string
): Promise<void> {
    const sourceDir: string = resolveCurrentPath([])
    const targetDir: string = join(dir, name)

    if (!await pathExists(targetDir))
        throw new Error(
            `Template "${name}" not found`
        )

    if (
        !(await askQuestion(`Update "${name}" with current directory? [Y/n]:`, "y")).startsWith("y")
    ) {
        log.info(
            "Update cancelled"
        )
        return
    }

    try {
        await copy(
            sourceDir,
            targetDir,
            true
        )
        log.success(
            `Template "${name}" updated`
        )
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : String(error)

        throw new Error(`Update template error: ${message}`, { cause: error })
    }
}

/**
 * Updates all templates from the global node_modules/minimaz/src/templates folder.
 * This ensures the local templates are synced with the installed package.
 *
 * @param templatesDir - Global templates directory
 */
export async function updateFromNodeModules(
    dir: string
): Promise<void> {
    const nodeModulesPath: string =
        await getNodeModulesTemplatesPath()
    const items: string[] =
        await getDirElements(nodeModulesPath)

    if (
        !((await askQuestion("Update local templates overwriting them with defaults? [Y/n]:", "y")).startsWith("y"))
    ) {
        log.info(
            "Update cancelled"
        )
        return
    }

    try {
        for (
            const i
            of items
        ) {
            const src: string =
                join(nodeModulesPath, i)

            const dest: string =
                join(dir, i)

            await copy(
                src,
                dest,
                true
            )
            log.success(
                `Updated "${i}"`
            )
        }
        log.info(
            `Templates updated successfully`
        )
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : String(error)

        throw new Error(`Update template error: ${message}`, { cause: error })
    }
}

/**
 * Deletes a global template by name from global templates directory
 *
 * @param dir - Global templates directory
 * @param name - Template name to delete
 */
export async function deleteTemplate(
    dir: string,
    name: string
): Promise<void> {
    const target: string = join(dir, name)
    if (!await pathExists(target))
        throw new Error(
            `Template not found: ${name}`
        )

    if (
        !(await askQuestion(`Confirm delete "${name}"? [Y/n]:`, "y")).startsWith("y")
    ) {
        log.info(
            "Delete cancelled"
        )
        return
    }

    try {
        await remove(target)
        log.success(
            `Template "${name}" deleted`
        )
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : String(error)

        throw new Error(`Delete template error: ${message}`, { cause: error })
    }
}

/**
 * Saves a folder (current or specified) as a new global template.
 *
 * @param dir - Global templates directory
 * @param targetPath - Optional path to save as a template
 */
export async function saveTemplate(
    dir: string,
    targetPath?: string
): Promise<void> {
    let source: string =
        resolveCurrentPath(
            targetPath
                ? [targetPath]
                : []
        )

    if (!await pathExists(source)) {
        log.warn(
            `Not found: ${source}`
        )
        if (
            (await askQuestion("Use current directory? [Y/n]:", "y")).startsWith("y")
        ) source = process.cwd()
        else throw new Error("Operation cancelled")

    }

    try {
        await ensureDir(dir)
        const dest: string =
            join(dir, basename(source))
        if (await pathExists(dest)) {
            if (
                !(await askQuestion(`Template "${basename(dest)}" exists. Overwrite? [y/N]:`, "n")).startsWith("y")
            ) {
                log.info(
                    "Save cancelled"
                )
                return
            }
        }
        await copy(
            source,
            dest,
            true
        )

        log.success(
            `Template saved to ${dest}`
        )
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : String(error)

        throw new Error(`Save template error: ${message}`, { cause: error })
    }
}

/**
 * Lists all available templates in a directory.
 *
 * @param dir - Templates directory path
 */
export async function listTemplates(
    dir: string
): Promise<void> {
    const templates: string[] =
        await getDirElements(dir)

    if (templates.length === 0) {
        log.info(
            "No global templates available"
        )
        return
    }

    log.info(
        "Available global templates:"
    )

    for (
        let i = 0;
        i < templates.length;
        i++
    ) {
        log.default(`${i} - ${templates[i]}`)
    }
}
