# Minimaz CLI

**Minimaz** is a minimal, low-dependency static site builder and project initializer focused on speed, simplicity, and clean output.

## 📦 Installation

Run directly with `npx` or as global module:

```bash
npx minimaz init my-site
cd my-site
npx minimaz build
npx minimaz version
```

Or  as global module:

```bash
minimaz init my-site
cd my-site
minimaz version
minimaz build
```

> During `npm install`, a post-install script runs to finalize setup automatically.

## 📁 Default Project Structure

```txt
my-site/
├── dist/               # Output folder (generated)
├── src/                # HTML, CSS, JS, TS files
├── minimaz.config.json
└── ...                 # Other optional files (es. package.json or .gitignore)
```

## ⚙️ Configuration

Customize your build using a `minimaz.config.json` file:

```json
{
    "input": {
        "dir": "./src",
        "mapping": {
            "pages": "",
            "public": "",
        },
        "externals": {
            "node_modules/bootstrap-icons/font/fonts": "public/fonts"
        },
        "exclude": []
    },
    "output": {
        "dir": "./dist",
        "replace": {
            "../public/": "/public/",
        },
        "css": {
            "bundling": true,
            "minify": true
        },
        "js": {
            "bundling": true,
            "minify": true
        },
        "html": {
            "minify": true
        }
    }
}
```

+ Bundling: Scans your files for import or require statements to create a dependency graph, then merges that code into a single file (or a few files) to reduce network requests.

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
# Validate
# -----------------------------
minimaz validate --path=/path/to/file

Validates HTML, CSS, JS, TS, JSON files

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
