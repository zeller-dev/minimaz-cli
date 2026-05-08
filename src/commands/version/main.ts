import {
    resolveCurrentPath
} from "../../shared/index.js"

import {
    log
} from "../../shared/logger/index.js"

import {
    readJsonFile
} from "../../shared/fs/index.js"

export async function version(): Promise<void> {
    const pkgPath: string =
        resolveCurrentPath(["package.json"])

    const data =
        await readJsonFile<{ version?: unknown }>(pkgPath)

    if (typeof data.version !== "string") {
        throw new Error(
            "Invalid or missing version in package.json"
        )
    }

    log.default(data.version)
}