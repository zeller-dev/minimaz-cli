import {
    // --- FUNCTIONS ---
    colorize,

    // --- TYPES ---
    MinimazConfig, PkgTemplate
} from "../index.js"

// ----- Package.json template -----
export const pkgTemplate: PkgTemplate = {
    version: '0.0.1',
    license: 'ISC',
    type: 'commonjs',
    scripts: {
        build: 'npx mz b',
        start: 'npx mz b && npx serve dist/'
    },
    devDependencies: {
        'minimaz-cli': 'latest',
        'serve': 'latest'
    }
}

// ----- .gitignore template -----
export const gitIgnoreTemplate: string =
    `node_modules
dist
.env
.vscode
.DS_Store
`.trim()

// ----- Default minimaz.config.json template -----
export const minimazConfigTemplate: MinimazConfig = {
    outDir: 'dist',
    bundling: {
        css: {
            enabled: true,
            outFile: 'styles.css'
        },
        js: {
            enabled: true,
            outFile: 'scripts.js'
        },
        outDir: ''
    },
    minify: {
        html: true,
        css: true,
        js: true
    },
    replace: {
        '../public/': 'public/'
    },
    styles: [
        'style.css',
        'style-2.css'
    ],
    scripts: [
        'script.js',
        'script-2.js'
    ],
    folders: {
        src: '',
        public: 'public'
    }
}
