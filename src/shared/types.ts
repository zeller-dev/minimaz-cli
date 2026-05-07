/**
 * Function signature for CLI commands.
 *
 * Commands may be synchronous or asynchronous, but should not return values.
 * Errors are expected to be handled internally or thrown for a higher-level handler.
 */
export type CommandFn = () => Promise<void> | void

/**
 * Default directory configuration shared across templates and runtime.
 */
export interface Defaults {
    globalDir: string
    inputDir: string
    outputDir: string
}

/**
 * Shared options for asset processing (CSS/JS).
 *
 * - bundling: merges multiple files into a single output
 * - minify: reduces file size by removing unnecessary content
 */
interface BundleOptions {
    bundling: boolean
    minify: boolean
}

/**
 * Main configuration structure for Minimaz.
 *
 * Defines how input files are discovered, transformed, and emitted to output.
 */
export interface MinimazConfig {

    // @TODO: add project infos: create time or similar
    input: {
        /**
         * Root directory for source files.
         */
        dir: string

        /**
         * Logical grouping of input subdirectories.
         * Key = logical name, Value = relative path inside `dir`.
         */
        mapping: Record<string, string>

        /**
         * External resources to include in the build.
         * Key = source (local path or URL)
         * Value = destination path in output directory
         */
        externals?: Record<string, string>

        /**
         * Glob patterns excluded from processing.
         */
        exclude?: string[]
    }

    output: {
        /**
         * Root directory for build output.
         */
        dir: string

        /**
         * String replacements applied during build (e.g. path rewriting).
         */
        replace?: Record<string, string>

        /**
         * CSS processing options.
         */
        css: BundleOptions

        /**
         * HTML processing options.
         */
        html: {
            minify: boolean
        }

        /**
         * JavaScript processing options.
         */
        js: BundleOptions
    }
}

/**
 * Maps file extensions (or identifiers) to processing handlers.
 *
 * Each handler receives:
 * - src: source file path
 * - dest: destination file path
 */
export type FileHandler =
    Record<string, (src: string, dest: string) => Promise<void>>

/**
 * Internal representation of a file during processing.
 */
export type File = {
    src: string
    dest: string
    content: string
    ext: string
}

/**
 * Persistent settings stored by the tool.
 *
 * - createdAt: ISO timestamp of initialization
 * - templatesPath: location of stored templates
 * - npmGlobalPath: resolved global npm directory
 */
export type Settings = {
    createdAt: string
    templatesPath: string
    npmGlobalPath: string
}