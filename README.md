# Minimaz ⚡

**Minimaz** is a minimal, zero-dependency static site builder and project initializer focused on speed, simplicity, and clean output.

## 🚀 Features

* 📁 Initialize projects from global templates
* 🧩 Save, list, and delete custom templates
* 📝 Supports HTML, CSS, JS, and TypeScript (.ts → .js)
* 🧹 Minifies HTML, CSS, JS, and TS (compiled & minified)
* ⚙️ Configurable with a `minimaz.config.json` file
* ➕ Supports concatenation of additional scripts and styles
* 🪄 Optional path replacements for asset links
* 🪶 Lightweight and fast — ideal for small static or utility projects
* 🔥 Usable with `minimaz` or alias `mz`
* 🆕 Display version with `minimaz version`

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
├── src/               # HTML, CSS, JS, TS files
├── public/            # Static assets (images, fonts, etc.)
├── dist/              # Output folder (generated)
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
minimaz init <project-name>       # Create a new project using global templates
minimaz build                     # Build and minify the site (uses config or defaults)
minimaz template <path>           # Save a new template from specified path (or current dir)
minimaz template -l               # List available templates
minimaz template -d <name>        # Delete a saved template
minimaz help                      # Show help message
minimaz version                   # Display Minimaz version
```

*All commands also work with the alias `mz`.*

## 📂 Templates

Minimaz supports global templates stored in:

```bash
~/.minimaz/templates
```

Use them to quickly initialize consistent projects across environments.

## 📄 License

MIT