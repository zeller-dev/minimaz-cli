const helpMessages = [
    'Usage:',
    '  minimaz init | i <project-name>   Create new project (default: minimaz-site)',
    '  minimaz build | b                 Build and minify files into /dist',
    '  minimaz help | h                 Show this help message'
]

export async function help() {
    helpMessages.forEach(m => console.log(m))
}