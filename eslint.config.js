import js from "@eslint/js"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config(
    {
        ignores: [
            "**/dist/**",
            "**/node_modules/**"]
    },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,

    {
        // 1. Target both TS and JS files for general rules and globals
        files: ["**/*.{ts,tsx,mts,js,cjs,mjs}"],
        languageOptions: {
            globals: {
                ...globals.node
            },
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/no-unused-vars": ["warn", {
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_"
            }],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-floating-promises": "error",
            "no-console": "off",
        },
    },

    {
        // 2. DISABLE type-checking for JS files
        // This prevents the "missing type information" error for builder.js
        files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
        ...tseslint.configs.disableTypeChecked,
    },

    {
        // 3. Keep your specific config override if needed
        files: ["eslint.config.js"],
        ...tseslint.configs.disableTypeChecked,
    }
)