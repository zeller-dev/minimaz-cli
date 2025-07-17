export const help = () => console.log(
    [
        'Usage:',
        '  minimaz init | i <project-name>       Create new project (default: minimaz-site)',
        '  minimaz build | b                     Build and minify files into /dist',
        '  minimaz template | t [path]           Save current folder as template (no path = current folder)',
        '     --list | -l                        List available global templates',
        '  minimaz run | r                       Run tasks (WIP)',
        '  minimaz help | h                      Show this help message'
    ].join('\n')
)
