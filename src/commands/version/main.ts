import {
    // --- FUNCTIONS ---
    log, readJsonFile, resolveCurrentPath
} from "../../shared/index.js"

export async function version(): Promise<void> {
    const pkgPath: string =
        resolveCurrentPath(["package.json"])

    const data = await readJsonFile<{ version?: unknown }>(pkgPath)

    if (typeof data.version !== "string") {
        throw new Error(
            "Invalid or missing version in package.json"
        )
    }

    log.default(data.version)
}