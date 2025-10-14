export function help(): void {
  console.log(
    [
      'Usage:',
      '\tminimaz init | i <project-name>\tCreate new project (default: minimaz-site)',
      '\t\t--template | -t <template-name>\tUse a global template (default: default)',
      '\tminimaz build | b\tBuild and minify files into dist folder',
      '\tminimaz template | t [path]\tSave current folder as template (no path = current folder)',
      '\t\t--list | -l\tList available global templates',
      '\t\t--delete | -d <template-name>\tDelete a global template',
      // '\tminimaz run | r\tRun tasks (WIP)',
      '\tminimaz help | h\tShow this help message'
    ].join('\n')
  )
}
