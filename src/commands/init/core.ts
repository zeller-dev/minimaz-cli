import {
    // --- CONSTANTS ---
    gitIgnoreTemplate, pkgTemplate,
    // --- FUNCTIONS  ---
    log, askQuestion, createFileFromTemplate,
    executeCommand,
} from "../../index.js"

export async function initNpm(
    targetDir: string,
    name: string
): Promise<void> {

    log("info", "Initializing NPM...")
    await createFileFromTemplate(
        { name: name, ...pkgTemplate },
        [targetDir, "package.json"]
    )

    log("debug", "Running npm install...")
    await executeCommand("npm", ["i"], targetDir)
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
 * @param remote     - Provider name ("github" | "gitlab") or remote URL
 * @param remoteName - Git remote name (default: origin)
 */
async function linkRemoteRepo(
    repoName: string,
    targetDir: string,
    remote: string,
    remoteName: string = "origin"
): Promise<void> {

    // Case 0: local → do nothing
    if (remote === "local") {
        log("info", "Using local Git repository only. No remote linked.")
        return
    }
    /**
     * Case 1: Existing repository URL (connect only)
     */
    if (/^https?:\/\//.test(remote) || remote.startsWith("git@")) {
        log("info", `Connecting existing remote "${remote}"`)
        await executeCommand(
            "git",
            ["remote", "add", remoteName, remote],
            targetDir
        )
        return
    }

    /**
     * Case 2: GitHub repository creation (via gh CLI)
     */
    if (remote === "github") {
        log("info", `Creating GitHub repository "${repoName}"`)
        await executeCommand(
            "gh",
            ["repo", "create", repoName, "--private", "--source=.", "--remote", remoteName],
            targetDir
        )
        return
    }

    /**
     * Case 3: GitLab repository creation (via glab CLI)
     */
    if (remote === "gitlab") {
        log("info", `Creating GitLab repository "${repoName}"`)

        const gitlabUser: string | undefined = process.env.GITLAB_USER
        if (!gitlabUser)
            throw new Error("GITLAB_USER environment variable not set")

        await executeCommand(
            "glab",
            ["repo", "create", repoName, "--source=."],
            targetDir
        )

        await executeCommand(
            "git",
            [
                "remote",
                "add",
                remoteName,
                `git@gitlab.com:${gitlabUser}/${repoName}.git`
            ],
            targetDir
        )
        return
    }
    // Unsupported provider
    throw new Error(`Unsupported git provider or remote: "${remote}"`)
}


/**
 * Initializes a Git repository in the given directory.
 *
 * @param targetDir - Directory to initialize Git
 * @param remoteUrl - Optional remote URL
 * @param provider - Optional provider ("github" | "gitlab")
 */
export async function initGit(
    projectName: string,
    targetDir: string,
    provider?: string,
    name: string = "origin"
): Promise<void> {

    // Ask for Git provider only if not explicitly provided
    if (!provider) {
        provider = (await askQuestion(
            "Select a provider or paste a url to connect your existing repo (cli tools needed) [LOCAL/github/gitlab]:",
            "local"
        )).toLowerCase().trim()
    }

    log("info", "Initializing Git repository...")

    // Initialize local git repository
    log("debug", "Running git init...")
    await executeCommand("git", ["init"], targetDir)

    // Only link remote if provider is not local
    if (
        provider
        && provider !== "false"
        && provider !== "local"
    ) await linkRemoteRepo(projectName, targetDir, provider, name)
    else
        log("info", "Git repository initialized locally. No remote linked.")

    // Add .gitignore
    log("debug", "Initializing gitignore...")
    await createFileFromTemplate(gitIgnoreTemplate, [targetDir, ".gitignore"])

    log("success", "Git repository initialized.")
}
