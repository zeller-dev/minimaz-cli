import {
    // --- TYPES ---
    Defaults, MinimazConfig, PkgTemplate
} from "../index.js"

/**
 * Default directory configuration used across templates.
 * Centralizing these values ensures consistency between generated files.
 */
export const defaults: Defaults = {
    globalDir: ".minimaz",
    inputDir: "./src",
    outputDir: "./dist"
}

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
        start: `npx mz b && npx serve ${defaults.outputDir}`
    },
    devDependencies: {
        "minimaz-cli": "latest",
        "serve": "latest"
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
dist
.env
.vscode
.DS_Store`

/**
 * Default minimaz configuration template.
 *
 * Provides a ready-to-use structure with:
 * - standard directory mapping
 * - example externals for asset handling
 * - sensible defaults for bundling and minification
 *
 * This serves as a baseline and is expected to be customized per project.
 */
export const minimazConfigTemplate: MinimazConfig = {
    input: {
        dir: defaults.inputDir,

        /**
         * Maps logical groups to subdirectories inside inputDir.
         * Empty string means root-level mapping.
         */
        mapping: {
            "pages": "",
            "scripts": "",
            "styles": "",
            "public": "",
        },

        /**
         * External resources to include in the build output.
         * Supports both local paths and remote URLs.
         *
         * Key: source path or URL
         * Value: destination path inside output directory
         */
        externals: {
            "./node_modules/example/fonts": "assets/fonts",
            "https://example.com/library.js": "js/vendor/vue.js"
        },

        /**
         * Glob patterns excluded from processing.
         */
        exclude: [
            "**/test/**",
            "**dev**"
        ]
    },

    output: {
        dir: defaults.outputDir,

        /**
         * Path replacements applied during build.
         * Useful for rewriting asset paths in final output.
         */
        replace: {
            "../public/": "/"
        },

        css: {
            bundling: true,
            minify: true,
        },

        html: {
            minify: true,
        },

        js: {
            bundling: true,
            minify: true,
        }
    }
}