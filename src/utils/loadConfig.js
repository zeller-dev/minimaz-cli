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
  }
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
    } catch (err) {
      log('', 'warning', `Warning: failed to parse minimaz.config.json - using defaults. Error: ${err.message}`)
      userConfig = {}
    }
  }

  // Merge user config with defaults
  const config = {
    src: userConfig.src || defaultConfig.src,
    dist: userConfig.dist || defaultConfig.dist,
    public: userConfig.public || defaultConfig.public,
    minify: {
      html: userConfig.minify?.html ?? defaultConfig.minify.html,
      css: userConfig.minify?.css ?? defaultConfig.minify.css,
      js: userConfig.minify?.js ?? defaultConfig.minify.js
    }
  }

  return config
}
