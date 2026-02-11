import fs from 'fs-extra'
import path from 'path'

import {
  log, askQuestion, getGlobalTemplatesDirPath, createFileFromTemplate, initGit, initNpmProject, resolveCurrentPath,// utils
  gitIgnoreTemplate, // constants
  initCommandOptions // types
} from '../index.js'

/**
 * Initializes a new Minimaz project.
 *
 * @param projectName - Name of the project directory to create
 * @param options - Initialization options (template, npm)
 */
export async function init(
  projectName: string,
  options: initCommandOptions
): Promise<void> {

  // Resolve global and local paths
  const templateDir: string = path.join(await getGlobalTemplatesDirPath(), options.template)
  const targetDir: string = resolveCurrentPath([projectName])

  // Ensure template exists
  if (!await fs.pathExists(templateDir))
    throw new Error(`Template '${options.template}' not found.`)

  // Ensure target directory does not already exist
  if (await fs.pathExists(targetDir))
    throw new Error(`Target directory '${targetDir}' already exists.`)

  // question npm init
  options.npm = options.npm
    ?? (await askQuestion('Init NPM? [Y/n]:', 'y')).startsWith('y')

  // question git init
  options.git = options.git
    ?? (await askQuestion('Init Git repository? [Y/n]:', 'y')).startsWith('y')

  if (options.git && !options.gitprovider)
    options.gitprovider = options.gitprovider
      ?? await askQuestion(
        'Select a provider or paste a url to connect your existing repo (cli tools needed) [LOCAL/github/gitlab]:',
        'local')

  // Copy template files to target directory
  log('debug', `Copying template from '${templateDir}' to '${targetDir}'`)
  await fs.copy(templateDir, targetDir)

  // add .gitignore
  log('debug', 'Initializing gitignore...')
  await createFileFromTemplate(
    gitIgnoreTemplate,
    path.join(targetDir, '.gitignore')
  )

  // Initialize npm if requested
  if (options.npm) await initNpmProject(targetDir, projectName)

  // Initialize git if requested
  if (options.git) await initGit(projectName, targetDir, options.gitprovider)

  log(
    'success',
    `Project '${projectName}' created using template '${options.template}'.`
  )
}