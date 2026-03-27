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

> During `npm install`, a post-install script runs to finalize setup automatically.

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
    outDir: "dist",
    bundling: {
        css: {
            enabled: true,
            outFile: "styles.css"
        },
        js: {
            enabled: true,
            outFile: "scripts.js"
        },
        outDir: ""
    },
    minify: {
        "html": true,
        "css": true,
        "js": true,
        "ts": true

    },

    replace: {
        "../public/": "public/"
    },

    styles: [
        "style.css",
        "style-2.css"
    ],

    scripts: [
        "script.js",
        "script-2.js"
    ],

    folders: {
        src: "",
        public: "public"
    }
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
# Config
# -----------------------------
minimaz config          # Create or update global configuration ~/.minimaz/
mz config --overwrite   # Overwrites default templates and settings.json

# -----------------------------
# Init
# -----------------------------
minimaz init <project-name> [options]          # Initialize a new project
mz i <project-name> [options]                  # Alias

Options:
  -t, --template <name>       # Use a specific template (default: 'default')
  --npm                       # Initialize npm project (creates package.json and runs npm install)
  --git                       # Initialize git repository
  --gitprovider <provider>    # Git provider: 'github', 'gitlab', or URL to existing repo
  --gitremote <url>           # Specify custom remote URL for git

# -----------------------------
# Help
# -----------------------------
minimaz help                    # Show general help
mz h                            # alias
minimaz help <command>          # Show help for a specific command
mz h build                      # alias example

# -----------------------------
# Template management
# -----------------------------
minimaz template [options] [<folder-path>]   # Save, list, update, or delete templates
mz t [options] [<folder-path>]               # Alias

Options:
  -l, --list                # List all global templates (~/.minimaz/templates)
  -d, --delete <name>       # Delete a global template by name (asks confirmation)
  -u, --update [name]       # Update templates
                            # - With a name → updates that template from current folder
                            # - Without argument → updates all templates from installed package defaults

Default action (no options):
  Saves the specified folder (or current folder if none provided) as a new global template.
  If template already exists, asks for confirmation before overwriting.

Notes:
  * Global templates are stored in `~/.minimaz/templates`.
  * Interactive prompts are used to confirm overwrite or deletion.
  * If specified folder does not exist, you can choose to use the current folder instead.
  * Errors are thrown if operations fail or are cancelled.

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

```txt

     _     _
    /)\___/(\
   /.--. .__.\   _-'''-_
  /\_(O) (O)_/\ /\ | /  \    ____    ____          ________         __   __
 _.-._(_c_)_.-./\ \ / / /)  [__  \  /  __]        [  __   _]       [  ] [  ]
(__(((______)))__--''/ //     ]   \/   [   ______ [_/ /'/    _____  ] [  ] [  _____  ______
 |__||_||_||_||__||  / )      [ [\  /] ]  [  /  \]   /'/  _ / /__\\ [ ]  [ ] / /__\\[  /  \]
 |  || || || ||  ||  |/      _] [_\/_] [_  ] [     _/'/__/ ]\ \___  ] [  ] [ \ \___  ] [
 |__||_||_||_||__||__|      [_____][_____][___]   [________] \___/ [___][___] \___/ [___]

    MrZeller
        Website: zellerindustries.com
            Mail: info@zellerindustries.com

```
