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
# Build Command - Build and minify the project
minimaz build
mz b            # alias

# Clears dist folder
minimaz clear
mz c            # alias

# Create a new project
minimaz init <project-name>                             # uses default template
mz i <project-name>                                     # alias
minimaz init <project-name> -template <template-name>   # uses specified template
mz i <project-name> -t <template-name>                  # alias

# Show help message
minimaz help
mz h # alias

# Manages templates
minimaz template <template-path>          # Save template
minimaz t <template-path>                 # alias
minimaz template -list                    # List saved templates
minimaz t -l                              # alias
minimaz template -delete <template-name>  # Delete a saved template
minimaz t -d <template-name>              # alias

# Display Minimaz version
minimaz version
mz v              # alias
```

## 📂 Templates

Minimaz supports global templates stored in:

```bash
~/.minimaz/templates
```

Use them to quickly initialize consistent projects across environments.

## 📄 License

MIT
