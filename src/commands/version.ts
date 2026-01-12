import path from "path"
import fs from "fs-extra"

import { log } from "../index.js"

export async function version(): Promise<void> {
    try {
        const pkgPath = path.resolve(process.cwd(), 'package.json')
        const { version } = await fs.readJson(pkgPath)

        if (typeof version !== 'string') throw new Error('Invalid or missing version in package.json')

        log('info', version)
    } catch (error: any) {
        log('error', `Unable to read package.json: ${error}`)
        process.exit(1)
    }
}