import {
    getGlobalTemplatesDirPath,
} from "../../shared/index.js"

import type {
    TemplateCommandOptions,
} from "./types.js"

import {
    deleteTemplate,
    listTemplates,
    saveTemplate,
    updateFromNodeModules,
    updateSingleTemplate
} from "./core.js"

/**
 * Template command handler. Supports listing, saving, updating, and deleting templates.
 *
 * @param targetPath - Optional path of the folder to save as template
 * @param options - CLI flags (--list, --delete, --update, etc.)
 */
export async function template(
    options: TemplateCommandOptions,
    targetPath?: string
): Promise<void> {

    const templatesDir: string =
        await getGlobalTemplatesDirPath()

    // list templates
    if (options.list)
        return await listTemplates(templatesDir)

    // delete template
    if (options.delete)
        return await deleteTemplate(templatesDir, options.delete)

    // Default action: save current folder as a template
    await saveTemplate(templatesDir, targetPath)

    // update template
    if (options.update) {
        if (typeof options.update === "string" && options.update.trim())
            return await updateSingleTemplate(templatesDir, options.update.trim())
        else
            return await updateFromNodeModules(templatesDir)
    }
}
