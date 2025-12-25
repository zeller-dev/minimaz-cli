# Minimaz, a Christmas Version 🎄

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
npx mz init my-site
npx mz build
npx mz version
```

## 📁 Project Structure

```txt
my-site/
├── dist/              # Output folder (generated)
├── public/            # Static assets (images, fonts, etc.)
├── src/               # HTML, CSS, JS, TS files
├── minimaz.config.json
└── ...
```

## ⚙️ Configuration

Customize your build using a `minimaz.config.json` file:

```json
{
  "src": "src",
  "dist": "dist",
  "public": "public",
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
  }
  "styles": [
    "style.css",
    "theme.css"
  ],
  "scripts": [
    "lib.js",
    "script.js"
  ]
}
```

* `styles` (optional): array of `.css` files to concatenate and minify into a single `style.css`
* `scripts` (optional): array of `.js` files to concatenate and minify into a single `script.js`
* If omitted, fallback defaults are `style.css` and `script.js`

## 🛠 Commands

```bash
minimaz build                     # Build and minify the site (uses config or defaults)
minimaz clear                     # Clears dist folder
minimaz init <project-name>       # Create a new project using global templates
minimaz help                      # Show help message
minimaz template <path>           # Save a new template from specified path (or current dir)
minimaz template -list               # List available templates
minimaz template -delete <name>        # Delete a saved template
minimaz version                   # Display Minimaz version
```

### Commands Aliases
```bash
mz b                      # Build and minify the site (uses config or defaults)
mz c                      # Clears dist folder
mz i <project-name>       # Create a new project using global templates
mz h                      # Show help message
mz t <path>               # Save a new template from specified path (or current dir)
mz t -l                   # List available templates
mz t -d <name>            # Delete a saved template
mz v                      # Display Minimaz version
```

## 📂 Templates

Minimaz supports global templates stored in:

```bash
~/.minimaz/templates
```

Use them to quickly initialize consistent projects across environments.

## 📄 License

MIT