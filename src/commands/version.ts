import path from "path"
import fs from "fs-extra"

export async function version(): Promise<void> {
    try {
        const pkgPath = path.resolve(process.cwd(), 'package.json')
        const { version } = await fs.readJson(pkgPath)

        if (typeof version !== 'string') {
            throw new Error('Invalid or missing version in package.json')
        }

        console.log(version)
    } catch (e: any) {
        console.error('Unable to read package.json:', e)
        process.exit(1)
    }
}