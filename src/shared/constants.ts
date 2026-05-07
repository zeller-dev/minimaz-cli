import type {
    Defaults,
    MinimazConfig
} from "./types.js"

/**
 * Default directory configuration used across templates.
 * Centralizing these values ensures consistency between generated files.
 */
export const defaults: Defaults = {
    globalDir:
        ".minimaz",
    inputDir:
        "./src",
    outputDir:
        "./dist"
} as const satisfies Defaults

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
            "./node_modules/example/fonts":
                "assets/fonts",
            "https://example.com/library.js":
                "js/vendor/vue.js"
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
} as const satisfies MinimazConfig