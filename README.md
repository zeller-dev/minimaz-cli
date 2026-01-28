# Minimaz CLI 🎄

**Minimaz** is a minimal, low-dependency static site builder and project initializer focused on speed, simplicity, and clean output.

## 🚀 Features

* 📁 Initialize projects from templates
* 🧩 Save, list, and delete custom templates
* 📝 Supports HTML, CSS, JS, and TypeScript (.ts → .js)
* 🧹 Minifies HTML, CSS, JS, and TS (compiled & minified)
* ⚙️ Configurable with a `minimaz.config.json` file
* ➕ Supports concatenation of additional scripts and styles
* 🪄 Optional path replacements for asset links
* 🪶 Lightweight and fast — ideal for small static or utility projects
* 🔥 Usable with `minimaz` or its alias `mz`
* 💻 NPM integration and optional Git repository initialization
* ⏱ Interactive prompts with 60s timeout

## 📦 Installation

Run directly with `npx` without global install:

```bash
npx minimaz init my-site
cd my-site
npx minimaz build
npx minimaz version
```

Or using the alias:

```bash
npx mz i my-site
npx mz b
npx mz v
```

## 📁 Project Structure

```txt
my-site/
├── dist/              # Output folder (generated)
├── public/            # Static assets (images, fonts, etc.)
├── src/               # HTML, CSS, JS, TS files
├── minimaz.config.json
├── package.json       # Optional, created if npm init is used
├── .gitignore         # Default gitignore copied from template
└── ...
```

## ⚙️ Configuration

Customize your build using a `minimaz.config.json` file:

```json
{
  "src": "src",
  "dist": "dist",
  "public": "public",
  "bundling": {
    "css": true,
    "js": true
  },
  "minify": {
    "html": true,
    "css": true,
    "js": true,
    "ts": true
  },
  "replace": {
    "../public/": "public/"
  },
  "folders": {
    "src": "",
    "public": "public"
  },
  "styles": [
    "../node_modules/some-package/dist/library.css",
    "C:/Users/YourUser/Desktop/custom.css"
  ],
  "scripts": [
    "../node_modules/some-package/dist/library.js",
    "D:/Scripts/custom.js"
  ]
}
```

* styles (optional): array of .css files to include in the build, can be inside src, node_modules, or any absolute/relative path on your system.
* scripts (optional): array of .js files to include in the build, can also point outside src.
* If omitted, fallback defaults are style.css and script.js.
* `bundling.css` / `bundling.js`: controls whether listed CSS/JS files are concatenated into a single `style.css` / `script.js`.
* `minify.html`, `minify.css`, `minify.js`, `minify.ts`: enable minification for the corresponding file types. TypeScript files are compiled to JS before minification.

**Tip**: Using external paths is useful for including library CSS/JS without copying them into your project.

## 🛠 Commands

```bash
# -----------------------------
# Build
# -----------------------------
minimaz build        # Build and minify the project
mz b                 # alias

# -----------------------------
# Clear
# -----------------------------
minimaz clear        # Delete the dist folder
mz c                 # alias

# -----------------------------
# Init
# -----------------------------
minimaz init <project-name>                     # Initialize a new project with default template
mz i <project-name>                             # alias

minimaz init <project-name> --template <name>   # Use a specific template
mz i <project-name> -t <name>                  # alias

minimaz init <project-name> --npm              # Initialize npm project
minimaz init <project-name> --git              # Initialize git repository

# Specify git provider or remote URL
minimaz init <project-name> --git --gitprovider <provider-or-url>
mz i <project-name> --git --gitprovider github       # alias example

# -----------------------------
# Help
# -----------------------------
minimaz help                    # Show general help
mz h                             # alias
minimaz help <command>          # Show help for a specific command
mz h build                       # alias example

# -----------------------------
# Template management
# -----------------------------
minimaz template <template-path>              # Save current folder as a template
minimaz t <template-path>                     # alias

minimaz template --list                       # List available global templates
minimaz t -l                                  # alias

minimaz template --delete <template-name>     # Delete a saved template
minimaz t -d <template-name>                  # alias

minimaz template --update <template-name>     # Update a specific template from current folder
minimaz t -u <template-name>                  # alias

minimaz template --update                     # Update all templates from node_modules
minimaz t -u                                  # alias

# -----------------------------
# Version
# -----------------------------
minimaz version        # Show Minimaz CLI version
mz v                   # alias
```

## 📂 Templates

Minimaz supports global templates stored in:

```bash
~/.minimaz/templates
```

Use them to quickly initialize consistent projects across environments.

## 📄 License

MIT
