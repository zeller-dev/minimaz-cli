import fs from 'fs-extra'
import path from 'path'
import { log } from './logService.js'

// ----- Types -----
interface MinifyOptions {
  html?: boolean
  css?: boolean
  js?: boolean
}

export interface MinimazConfig {
  src: string
  dist: string
  public?: string
  minify?: MinifyOptions
  replace?: Record<string, string>
  [key: string]: any
}

// ----- Default Config -----
const defaultConfig: MinimazConfig = {
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
function deepMerge(target: any, source: any): any {
  const result = { ...target }

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
export async function loadConfig(): Promise<MinimazConfig> {
  const configPath = path.resolve(process.cwd(), 'minimaz.config.tson')

  let userConfig: Partial<MinimazConfig> = {}
  if (await fs.pathExists(configPath)) {
    try {
      userConfig = await fs.readJson(configPath)
      log('info', 'Loaded config from minimaz.config.tson')
    } catch (e: any) {
      throw new Error(`Failed to parse minimaz.config.tson: ${e.message}`)
    }
  } else {
    log('info', 'No minimaz.config.tson found. Using default config')
  }

  const config: MinimazConfig = deepMerge(defaultConfig, userConfig)

  if (!config.src || !config.dist) throw new Error('Invalid configuration: src and dist are required')

  return config
}
