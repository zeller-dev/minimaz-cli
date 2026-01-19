import path from 'path'
import fs from 'fs-extra'

import {
    loadConfig, log,
    MinimazConfig
} from '../index.js'

export async function clear(): Promise<void> {
    const config: MinimazConfig = await loadConfig()
    const distDir: string = path.resolve(process.cwd(), config.dist || 'dist')
    if (!fs.existsSync(distDir)) {
        log('info', `No dist folder found: ${distDir}`)
        return
    }
    fs.remove(distDir)
    log('success', `Cleared ${distDir}`)
}