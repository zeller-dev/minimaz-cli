import fs from 'fs-extra'

import {
    log, askQuestion, getGlobalTemplatePath, createFileFromTemplate, resolveCurrentPath, executeCommand, // utils
    gitIgnoreTemplate, pkgTemplate, minimazConfigTemplate, // constants
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

    // Resolve targetDir and check if it exists
    const targetDir: string = resolveCurrentPath([projectName])
    if (await fs.pathExists(targetDir))
        throw new Error(`Target directory '${targetDir}' already exists.`)

    // Resolve templateDir and check if it exists
    const templateDir: string = await getGlobalTemplatePath(options.template)

    // Copy template files to target directory
    log('debug', `Copying template from '${templateDir}' to '${targetDir}'`)
    await fs.copy(templateDir, targetDir)

    // add minimaz.config.json
    log('debug', 'Initializing minimaz.config.json...')
    await createFileFromTemplate(
        minimazConfigTemplate,
        [targetDir, 'minimaz.config.json']
    )

    // Check for NPM initialization option (ask if not provided)
    const useNpm = options.npm !== undefined
        ? Boolean(options.npm)
        : (await askQuestion('Init NPM? [Y/n]:', 'y')).toLowerCase().startsWith('y')
    if (useNpm) await initNpm(targetDir, projectName)

    // Check for Git initialization option (ask if not provided)
    const useGit = options.git !== undefined
        ? Boolean(options.git)
        : (await askQuestion('Init Git repository? [Y/n]:', 'y')).toLowerCase().startsWith('y')
    if (useGit) await initGit(projectName, targetDir, options.gitprovider)

    log(
        'success',
        `Project '${projectName}' created using template '${options.template}'.`
    )
}

/**
 * Initializes a Git repository in the given directory.
 *
 * @param targetDir - Directory to initialize Git
 * @param remoteUrl - Optional remote URL
 * @param provider - Optional provider ('github' | 'gitlab')
 */
export async function initGit(
    projectName: string,
    targetDir: string,
    provider?: string,
    name: string = 'origin'
): Promise<void> {

    // Ask for Git provider only if git is enabled
    if (!provider) {
        provider = (await askQuestion(
            'Select a provider or paste a url to connect your existing repo (cli tools needed) [LOCAL/github/gitlab]:',
            'local'
        )).toLowerCase().trim()
    }

    log('info', 'Initializing Git repository...')

    // Initialize local git repository
    log('debug', 'Running git init...')
    await executeCommand('git', ['init'], targetDir)

    if (provider)
        await linkRemoteRepo(projectName, targetDir, provider, name)
    else
        log('info', 'Git repository initialized locally')

    // add .gitignore
    log('debug', 'Initializing gitignore...')
    await createFileFromTemplate(
        gitIgnoreTemplate,
        [targetDir, '.gitignore']
    )

    log('success', 'Git repository initialized.')
}

/**
 * Creates or connects a remote Git repository.
 *
 * Supported modes:
 * - GitHub (via gh CLI)
 * - GitLab (via glab CLI)
 * - Existing remote URL (SSH / HTTPS)
 *
 * This function does NOT create commits.
 *
 * @param repoName   - Repository name
 * @param targetDir  - Local repository directory
 * @param remote     - Provider name ('github' | 'gitlab') or remote URL
 * @param remoteName - Git remote name (default: origin)
 */
async function linkRemoteRepo(
    repoName: string,
    targetDir: string,
    remote: string,
    remoteName: string = 'origin'
): Promise<void> {
    /**
     * Case 1: Existing repository URL (connect only)
     */
    if (/^https?:\/\//.test(remote) || remote.startsWith('git@')) {
        log('info', `Connecting existing remote '${remote}'`)
        await executeCommand(
            'git',
            ['remote', 'add', remoteName, remote],
            targetDir
        )
        return
    }

    /**
     * Case 2: GitHub repository creation (via gh CLI)
     */
    if (remote === 'github') {
        log('info', `Creating GitHub repository '${repoName}'`)
        await executeCommand(
            'gh',
            ['repo', 'create', repoName, '--private', '--source=.', '--remote', remoteName],
            targetDir
        )
        return
    }

    /**
     * Case 3: GitLab repository creation (via glab CLI)
     */
    if (remote === 'gitlab') {
        log('info', `Creating GitLab repository '${repoName}'`)

        const gitlabUser = process.env.GITLAB_USER
        if (!gitlabUser)
            throw new Error('GITLAB_USER environment variable not set')

        await executeCommand(
            'glab',
            ['repo', 'create', repoName, '--source=.'],
            targetDir
        )

        await executeCommand(
            'git',
            [
                'remote',
                'add',
                remoteName,
                `git@gitlab.com:${gitlabUser}/${repoName}.git`
            ],
            targetDir
        )
        return
    }
    // Unsupported provider
    throw new Error(`Unsupported git provider or remote: '${remote}'`)
}

export async function initNpm(
    targetDir: string,
    name: string
): Promise<void> {

    log('info', 'Initializing NPM...')
    await createFileFromTemplate(
        { name: name, ...pkgTemplate },
        [targetDir, 'package.json']
    )

    log('debug', 'Running npm install...')
    await executeCommand('npm', ['i'], targetDir)
}