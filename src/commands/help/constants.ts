import {
    defaults,
    CommandHelp
} from "../../index.js";

// ----- CLI Commands Help -----
export const commandsHelp: Record<string, CommandHelp> = {
    build: {
        usage:
            "minimaz build | b",
        description:
            `Build project into outDir folder (default: ${defaults.outputDir})`
    },
    clear: {
        usage:
            "minimaz clear | c",
        description:
            `Clear the outDir folder (default: ${defaults.outputDir})`
    },
    help: {
        usage:
            "minimaz help | h",
        description:
            "Show this help message"
    },
    init: {
        usage:
            "minimaz init | i <project-name>",
        description:
            "Create a new project (default: 'minimaz-project')",
        options: {
            "--template | -t <template-name>": "Use a global template (default: 'default')"
        }
    },
    template: {
        usage:
            "minimaz template | t [path]",
        description:
            "Save folder as a template (no path = current folder)",
        options: {
            "--list | -l":
                "List available global templates",
            "--delete | -d <template-name>":
                "Delete a global template"
        }
    },
    validate: {
        usage:
            "minimaz validate",
        description:
            "Validate file"
    },
    version: {
        usage:
            "minimaz version | v",
        description:
            "Show Minimaz version"
    }
}