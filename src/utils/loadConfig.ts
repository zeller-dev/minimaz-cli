import fs from 'fs-extra'
import path from 'path'
import { log } from './logService.js'

// ----- Default Config -----
// Provides default values for project build and minification
const defaultConfig: any = {
  src: 'src',
  dist: 'dist',
  public: 'public',
  minify: {
    html: true,
    css: true,
    js: true
  },
  replace: {}
}

// ----- Deep Merge Function -----
// Recursively merges user config into default config
function deepMerge(target: any, source: any): any {
  const result: any = { ...target }

  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(target[key] || {}, source[key])
    } else if (source[key] !== undefined) {
      result[key] = source[key]
    }
  }

  return result
}

// ----- Load User Config -----
// Loads minimaz.config.tson if present and merges it with default config
export async function loadConfig(): Promise<any> {
  const configPath: string = path.resolve(process.cwd(), 'minimaz.config.json')

  let userConfig: Partial<any> = {}
  if (await fs.pathExists(configPath)) {
    try {
      userConfig = await fs.readJson(configPath)
      log('info', 'Loaded config from minimaz.config.tson')
    } catch (error: any) {
      throw new Error(`Failed to parse minimaz.config.tson: ${error.message}`)
    }
  } else {
    log('info', 'No minimaz.config.tson found. Using default config')
  }

  const config: any = deepMerge(defaultConfig, userConfig)

  if (!config.src || !config.dist) throw new Error('Invalid configuration: src and dist are required')

  return config
}