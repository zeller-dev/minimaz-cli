import fs from 'fs-extra'
import path from 'path'

import {
  log,
  createGlobalDir,
  askQuestion,
  executeCommand,
  createFileFromTemplate,
  pkgTemplate,
  gitIgnoreTemplate,
  initGit,
  getGlobalDirPath,
  resolveCurrentPath
} from '../index.js'

/**
 * Initializes a new Minimaz project.
 *
 * The command:
 * - copies a project template from the global Minimaz directory
 * - optionally initializes an npm project
 * - optionally installs dependencies
 *
 * This function follows an Angular-like workflow:
 * files are generated first, then dependencies are installed.
 *
 * @param projectName - Name of the project directory to create
 * @param options - Initialization options (template, npm)
 */
export async function init(
  projectName: string,
  options: any = {}
): Promise<void> {

  // Resolve global and local paths
  const minimazDir: string = await getGlobalDirPath()
  const templateName: string = options.template ?? 'default'
  const templateDir: string = path.join(minimazDir, 'templates', templateName)
  const targetDir: string = resolveCurrentPath([projectName])

  /**
   * This directory contains user templates and settings.
   */
  if (!await fs.pathExists(minimazDir)) {
    log('info', `Global folder '${minimazDir}' not found. Creating...`)
    await createGlobalDir()
  }

  /**
   * Validate that the selected template exists.
   * Failing early avoids creating partial projects.
   */
  if (!await fs.pathExists(templateDir))
    throw new Error(`Template '${templateName}' not found.`)

  if (await fs.pathExists(targetDir))
    throw new Error(`Target directory '${targetDir}' already exists.`)

  const initNpm: boolean =
    options.npm
    ?? (await askQuestion('Init NPM? [y/n]:', 'y')).startsWith('y')

  const initGitRepo: boolean =
    options.git
    ?? (await askQuestion('Init Git repository? [y/n]:', 'y')).startsWith('y')

  if (initGitRepo) {
    options.gitprovider = options.gitprovider ??
      await askQuestion(
        'Select a provider or paste a url to connect your existing repo (cli tools needed) [local/github/gitlab]:',
        'local')
  }

  /**
   * Copy template files into the target project directory.
   * At this point no side effects (npm, git, etc.) are executed.
   */
  log('info', `Copying template from '${templateDir}' to '${targetDir}'`)
  await fs.copy(templateDir, targetDir)

  /**
   * Copy a shared .gitignore if present.
   * The file lives one level above the templates directory.
   */
  log('info', 'Initializing gitignore...')
  await createFileFromTemplate(
    gitIgnoreTemplate,
    path.join(targetDir, '.gitignore')
  )

  /**
   * Initialize npm only after all files are in place.
   * This mirrors the behavior of tools like Angular CLI.
   */
  if (initNpm) {
    log('info', 'Initializing NPM...')
    await createFileFromTemplate(
      { name: projectName, ...pkgTemplate },
      path.join(targetDir, 'package.json')
    )
    await executeCommand('npm', ['install'], targetDir)
  }

  if (initGitRepo) {
    log('info', 'Initializing GIT...')
    await initGit(projectName, targetDir, options.gitprovider)
  }

  log(
    'success',
    `Project '${projectName}' created using template '${templateName}'.`
  )
}