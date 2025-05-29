# Minimaz ⚡

**Minimaz** is a minimal, zero-dependency static site builder focused on speed, simplicity, and clean output.

## 🚀 Features

- 📁 Simple and intuitive file structure
- 🧹 Minifies HTML, CSS, and JavaScript
- ⚙️ Configurable with a `minimaz.config.json` file
- 🪄 Optional path replacements for asset links
- 🪶 Lightweight and fast — ideal for small static projects

## 📦 Installation

Use `npx` to run Minimaz without installing globally:

```bash
npx minimaz init my-site
cd my-site
npx minimaz build
```

## 📁 Project Structure

```txt
my-site/
├── src/               # HTML, CSS, JS files
├── public/            # Static assets (images, fonts, etc.)
├── dist/              # Output folder (generated)
├── minimaz.config.json
└── ...
```

## ⚙️ Configuration

Customize your build using a `minimaz.config.json` file in the root directory:

```json
{
  "src": "src",
  "dist": "dist",
  "public": "public",
  "minify": {
    "html": true,
    "css": true,
    "js": true
  },
  "replace": {
    "../public/": "public/"
  }
}
```

## 🛠 Commands

```bash
minimaz init <project-name>   # Create a new project
minimaz build                 # Build and minify the site
minimaz help                  # Show help message
```

## 📄 License

MIT