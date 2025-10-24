/**
 * Displays CLI usage information for Minimaz.
 * Lists all available commands and their options.
 *
 * Example:
 *   minimaz init my-site -t default
 *   minimaz build
 *   minimaz template --list
 */
export function help(): void {
  console.log([
    'Usage:',
    '',
    '\tminimaz init | i <project-name>',
    '\t\tCreate a new project (default: "minimaz-site")',
    '\t\tOptions:',
    '\t\t\t--template | -t <template-name>\tUse a global template (default: "default")',
    '',
    '\tminimaz build | b',
    '\t\tBuild and minify files into the dist folder',
    '',
    '\tminimaz template | t [path]',
    '\t\tSave current folder as a template (no path = current folder)',
    '\t\tOptions:',
    '\t\t\t--list | -l\tList available global templates',
    '\t\t\t--delete | -d <template-name>\tDelete a global template',
    '',
    '\tminimaz help | h',
    '\t\tShow this help message'
  ].join('\n'));
}

// @TODO add help for each command