import {
    Loader,
    transform
} from "esbuild"

import {
    minify
} from "html-minifier-terser"

import {
    // --- FUNCTIONS ---
    log,
    MinimazConfig,
    minimazConfigTemplate
} from "../../index.js"

/**
 * Validates JS, TS, and CSS using esbuild.
 */
export async function validateWithEsbuild(
    filePath: string,
    content: string, ext: string
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

        log("success", `${loader.toUpperCase()} Valid: ${filePath}`)
    } catch (error: any) {
        log("error", `Syntax Error in ${filePath}:`)

        // Handle esbuild-specific error formatting
        if (error.errors)
            error.errors.forEach((err: any) => {
                const line = err.location?.line ?? "??"
                log("error", `   -> Line ${line}: ${err.text}`)
            })
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
        log("success", `HTML Valid: ${filePath}`)
    } catch (error: any) {
        log("error", `HTML Error [${filePath}]: ${error.message}`)
    }
}

export async function validateConfig(
    filePath: string,
    content: string
): Promise<void> {
    try {
        // Cast iniziale a Partial per avere l'autocompletamento di TS,
        // ma consapevoli che a runtime potrebbe essere qualsiasi cosa
        const config: Partial<MinimazConfig> = JSON.parse(content);
        const errors: string[] = [];

        // Helper per validare un oggetto chiave-valore di stringhe
        const isStringRecord = (obj: any): boolean =>
            obj && typeof obj === "object" && !Array.isArray(obj) &&
            Object.values(obj).every(v => typeof v === "string");

        // 1. Validazione blocco INPUT
        if (!config.input) {
            errors.push("Missing 'input' section.");
        } else {
            const { input } = config;
            if (typeof input.dir !== "string")
                errors.push("input.dir must be a string.");
            if (!isStringRecord(input.mapping))
                errors.push("input.mapping must be a valid key-value record of strings.");
            if (input.externals !== undefined && !isStringRecord(input.externals))
                errors.push("input.externals must be a valid key-value record of strings.");
            if (input.exclude !== undefined && !Array.isArray(input.exclude))
                errors.push("input.exclude must be an array of strings.");
        }

        // 2. Validazione blocco OUTPUT
        if (!config.output) {
            errors.push("Missing 'output' section.");
        } else {
            const { output } = config;
            if (typeof output.dir !== "string")
                errors.push("output.dir must be a string.");
            if (output.replace !== undefined && !isStringRecord(output.replace))
                errors.push("output.replace must be a valid key-value record of strings.");

            // Validazione BundleOptions (CSS & JS)
            const bundleFields: ("css" | "js")[] = ["css", "js"];
            bundleFields.forEach(field => {
                const val = output[field];
                if (!val || typeof val.bundling !== "boolean" || typeof val.minify !== "boolean") {
                    errors.push(`output.${field} must contain 'bundling' (boolean) and 'minify' (boolean).`);
                }
            });

            // Validazione HTML
            if (!output.html || typeof output.html.minify !== "boolean") {
                errors.push("output.html must contain 'minify' (boolean).");
            }
        }

        // 3. (Opzionale) Controllo per chiavi sconosciute usando il template come guida
        const allowedTopLevelKeys = Object.keys(minimazConfigTemplate);
        Object.keys(config).forEach(key => {
            if (!allowedTopLevelKeys.includes(key)) {
                log("warn", `Unknown configuration key: '${key}' in ${filePath}`);
            }
        });

        // 4. Se ci sono errori critici, interrompiamo
        if (errors.length > 0) {
            throw { isValidationError: true, errors };
        }

        log("success", `CONFIG Valid: ${filePath}`);
    } catch (error: any) {
        log("error", `Config Error in ${filePath}:`);

        // Gestione errori di validazione dello schema
        if (error.isValidationError) {
            error.errors.forEach((err: string) => {
                log("error", `   -> ${err}`);
            });
        }
        // Gestione errori di sintassi JSON malformato
        else if (error instanceof SyntaxError) {
            log("error", `   -> Invalid JSON syntax: ${error.message}`);
        }
        // Fallback generico
        else {
            log("error", `   -> ${error.message}`);
        }
    }
}