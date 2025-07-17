import fs from 'fs-extra'
import path from 'path'
import { log } from './logService.js'

const defaultConfig = {
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

/**
 * Deep merge two objects (simple implementation)
 * @param {Object} target
 * @param {Object} source
 * @returns {Object} merged object
 */
function deepMerge(target, source) {
  const result = { ...target }

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key])
    } else if (source[key] !== undefined) {
      result[key] = source[key]
    }
  }

  return result
}

/**
 * Loads user config from minimaz.config.json if exists, otherwise returns defaults
 * @returns {Promise<Object>} config object
 */
export async function loadConfig() {
  const configPath = path.resolve(process.cwd(), 'minimaz.config.json')

  let userConfig = {}
  if (await fs.pathExists(configPath)) {
    try {
      userConfig = await fs.readJson(configPath)
      log('info', 'Loaded config from minimaz.config.json')
    } catch (e) {
      log('warning', `Failed to parse minimaz.config.json. Using defaults. Error: ${e.message}`)
    }
  } else {
    log('info', 'No minimaz.config.json found. Using default config')
  }

  const config = deepMerge(defaultConfig, userConfig)

  if (!config.src || !config.dist) {
    log('error', 'Invalid configuration: src and dist are required')
    process.exit(1)
  }

  return config
}
