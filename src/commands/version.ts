import {
    // --- FUNCTIONS ---
    readJsonFile, resolveCurrentPath
} from "../index.js"

export async function version(): Promise<void> {
    const pkgPath: string =
        resolveCurrentPath(['package.json'])
    const { version } =
        await readJsonFile(pkgPath)

    if (typeof version !== 'string')
        throw new Error(
            'Invalid or missing version in package.json'
        )

    console.log(version)
}