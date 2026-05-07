import { defaults } from "../../shared/index.js";
import type { PkgTemplate } from "./types.js";

/**
 * Template for generated package.json.
 *
 * Designed for quick project bootstrap with:
 * - build command via minimaz CLI
 * - static serving of output directory
 *
 * Note: versions are set to "latest" to favor ease of setup over reproducibility.
 */
export const pkgTemplate: PkgTemplate = {
    version: "0.0.1",
    license: "ISC",
    type: "commonjs",
    scripts: {
        // Builds the project using minimaz CLI
        build: "npx mz b",

        // Builds and serves output directory locally
        start:
            `npx mz b && npx serve ${defaults.outputDir}`
    },
    devDependencies: {
        "minimaz-cli":
            "latest",
        "serve":
            "latest"
    }
}

/**
 * Default .gitignore content.
 *
 * Excludes:
 * - dependencies
 * - build output
 * - environment files
 * - editor/system-specific files
 */
export const gitIgnoreTemplate: string = `node_modules
${defaults.outputDir.replace("./", "")}
.env
.vscode
.DS_Store`