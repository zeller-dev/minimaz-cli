import path from "path"
import fs from "fs-extra"
import { log } from "../utils/logService.js"

export async function version(): Promise<void> {
    try {
        const pkgPath = path.resolve(process.cwd(), 'package.json')
        const { version } = await fs.readJson(pkgPath)

        if (typeof version !== 'string') throw new Error('Invalid or missing version in package.json')

        console.log(version)
    } catch (e: any) {
        log('error', `Unable to read package.json: ${e}`)
        process.exit(1)
    }
}