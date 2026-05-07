import { minimazConfigTemplate } from "../constants.js"
import { log } from "../logger/index.js"
import { MinimazConfig } from "../types.js"

import {
    Message,
    transform
} from "esbuild"

import type {
    Loader
} from "esbuild"

import {
    minify
} from "html-minifier-terser"


/**
 * Validates JS, TS, and CSS using esbuild.
 */
export async function validateWithEsbuild(
    filePath: string,
    content: string,
    ext: string
): Promise<void> {
    try {
        const loader = (
            ext === ".css"
                ? "css"
                : (ext.includes("ts")
                    ? "ts"
                    : "js"
                )
        ) as Loader

        await transform(
            content,
            {
                loader,
                format: "esm",
                logLevel: "silent",
            }
        )

        log.success(
            `${loader.toUpperCase()} Valid: ${filePath}`
        )
    } catch (error: unknown) {
        log.error(
            `Syntax Error in ${filePath}:`
        )

        // Type guard per esbuild errors
        const err =
            error as { errors?: Message[] }
        if (
            err.errors
            && Array.isArray(err.errors)
        ) {
            err.errors.forEach((m: Message) => {
                const line =
                    m.location?.line ?? "??"
                log.error(
                    `   -> Line ${line}: ${m.text}`
                )
            })
        }
    }
}

/**
 * Validates HTML via html-minifier-terser.
 */
export async function validateHTML(
    filePath: string,
    content: string
): Promise<void> {
    try {
        await minify(content, {
            continueOnParseError: false,
            caseSensitive: true
        })
        log.success(
            `HTML Valid: ${filePath}`
        )
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(
            `HTML Error [${filePath}]: ${message}`
        )
    }
}

/**
 * Custom error type for configuration validation failures.
 * Contains a list of human-readable validation errors.
 */
class ConfigValidationError extends Error {
    errors: string[]

    constructor(errors: string[]) {
        super("Config validation error")
        this.name = "ConfigValidationError"
        this.errors = errors
    }
}

/**
 * Type guard to validate a Record<string, string>.
 * Ensures:
 * - value is a non-null object
 * - not an array
 * - all values are strings
 */
function isStringRecord(obj: unknown): obj is Record<string, string> {
    return (
        typeof obj === "object"
        && obj !== null
        && !Array.isArray(obj)
        && Object.values(
            obj as Record<string, unknown>
        ).every(v => typeof v === "string")
    )
}

/**
 * Validates a Minimaz configuration file.
 *
 * Responsibilities:
 * - Parse JSON safely
 * - Validate structure against expected schema
 * - Collect all validation errors (non-failing fast)
 * - Log warnings for unknown keys
 * - Throw structured error if validation fails
 *
 * @param filePath - Path of the config file (used for logging context)
 * @param content - Raw JSON string content of the config file
 */
export function validateConfig(
    filePath: string,
    content: string
): void {
    try {
        /**
         * Step 1: Parse JSON safely as unknown
         * We never trust JSON.parse output directly.
         */
        const raw: unknown = JSON.parse(content)

        // Ensure root is a valid object
        if (typeof raw !== "object" || raw === null) throw new Error(
            "Invalid config root object"
        )


        const config = raw as Partial<MinimazConfig>

        // Collect all validation issues instead of failing early
        const errors: string[] = []

        // =========================
        // 1. INPUT SECTION
        // =========================
        if (!config.input) {
            errors.push("Missing 'input' section")
        } else {
            const { input } = config

            // Validate input directory path
            if (typeof input.dir !== "string") {
                errors.push("input.dir must be a string")
            }

            // Validate mapping object (string -> string)
            if (!isStringRecord(input.mapping)) {
                errors.push("input.mapping must be a valid key-value record of strings")
            }

            // Optional externals mapping
            if (
                input.externals !== undefined
                && !isStringRecord(input.externals)
            ) {
                errors.push("input.externals must be a valid key-value record of strings")
            }

            // Optional exclude list
            if (
                input.exclude !== undefined
                && !Array.isArray(input.exclude)
            ) {
                errors.push("input.exclude must be an array of strings")
            }
        }

        // =========================
        // 2. OUTPUT SECTION
        // =========================
        if (!config.output) {
            errors.push("Missing 'output' section")
        } else {
            const { output } = config

            // Output directory validation
            if (typeof output.dir !== "string") {
                errors.push("output.dir must be a string")
            }

            // Optional replace map validation
            if (
                output.replace !== undefined
                && !isStringRecord(output.replace)
            ) {
                errors.push("output.replace must be a valid key-value record of strings")
            }

            // Validate bundling configuration for CSS/JS
            const bundleFields: ("css" | "js")[] = ["css", "js"]

            bundleFields.forEach(field => {
                const val = output[field]

                if (
                    !val
                    || typeof val.bundling !== "boolean"
                    || typeof val.minify !== "boolean"
                ) {
                    errors.push(
                        `output.${field} must contain 'bundling' (boolean) and 'minify' (boolean)`
                    )
                }
            })

            // Validate HTML configuration
            if (
                !output.html
                || typeof output.html.minify !== "boolean"
            ) {
                errors.push("output.html must contain 'minify' (boolean)")
            }
        }

        // =========================
        // 3. UNKNOWN KEY DETECTION
        // =========================
        const allowedTopLevelKeys =
            Object.keys(minimazConfigTemplate)

        Object.keys(config).forEach(key => {
            if (!allowedTopLevelKeys.includes(key)) {
                log.warn(
                    `Unknown configuration key: '${key}' in ${filePath}`
                )
            }
        })

        // =========================
        // 4. FINAL VALIDATION CHECK
        // =========================
        if (errors.length > 0)
            throw new ConfigValidationError(errors)

        log.success(
            `Config: valid`
        )
    } catch (error: unknown) {
        // =========================
        // ERROR HANDLING
        // =========================

        log.error(
            `Config Error in ${filePath}:`
        )

        // Structured validation errors
        if (error instanceof ConfigValidationError) {
            error.errors.forEach(err => {
                log.error(
                    `\t-> ${err}`
                )
            })
        }

        // JSON syntax errors
        else if (error instanceof SyntaxError) {
            log.error(
                `\t-> Invalid JSON syntax: ${error.message}`
            )
        }

        // Generic runtime errors
        else if (error instanceof Error) {
            log.error(
                `\t-> ${error.message}`
            )
        }

        // Unknown thrown values (defensive fallback)
        else {
            log.error(
                "\t-> Unknown error"
            )
        }
    }
}
