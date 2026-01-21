import path from "path"
import fs from "fs-extra"

import { log } from "../index.js"

export async function version(): Promise<void> {
    const pkgPath: string = path.resolve(process.cwd(), 'package.json')
    const { version } = await fs.readJson(pkgPath)

    if (typeof version !== 'string')
        throw new Error('Invalid or missing version in package.json')

    log('info', version)
}