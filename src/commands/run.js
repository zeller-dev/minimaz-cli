import fs from 'fs-extra'
import path from 'path'
import { spawn } from 'child_process'
import { loadConfig } from '../utils/loadConfig.js'
import { log } from '../utils/logService.js'

export async function run() {
    const config = await loadConfig()
    const viteConfigPath = path.resolve('vite.config.js')
    const viteBinPath = path.resolve('node_modules/.bin/vite')

    // Create vite.config.js if not found
    if (!await fs.pathExists(viteConfigPath)) {
        log('', 'warn', 'vite.config.js not found. Creating one...')

        const viteConfig = `export default {  root: '${config.src}',  server: { open: true }}`
        await fs.writeFile(viteConfigPath, viteConfig)
        log('⚙️', 'info', 'Created vite.config.js')
    }

    // Install vite if not present
    if (!await fs.pathExists(viteBinPath)) {
        log('📦', 'info', 'Vite not found. Installing...')
        await new Promise((resolve, reject) => {
            const install = spawn('npm', ['install', '-D', 'vite'], { stdio: 'inherit', shell: true })
            install.on('close', code => code === 0 ? resolve() : reject(new Error('Failed to install vite')))
        })
        log('✅', 'info', 'Vite installed.')
    }

    // Start Vite
    log('🚀', 'info', 'Starting Vite dev server...')
    const proc = spawn('npx', ['vite'], { stdio: 'inherit', shell: true })
    proc.on('error', err => log('❌', 'error', `Failed to start Vite: ${err.message}`))
}
