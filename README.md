# Home Assistant Assist Client

A client for Home Assistant Assist that can be run as a web app or desktop app.

## Features

- Home Assistant Assist integration
- Available as a web app
- Available as a desktop app using Electron

## Development

### Web App

```bash
# Install dependencies
bun install

# Start the development server
bun run dev
```

### Desktop App

The desktop app uses Electron, which runs separately from the web build.

```bash
# Install dependencies
bun install

# Build and run desktop app in development mode
bun run electron:dev
```

## Building

### Web App

To build the web app for deployment:

```bash
# Build the web app
bun run build
```

### Desktop App

The desktop app requires both the web files and the Electron files to be built. Use the specialized scripts to ensure compatibility:

```bash
# Build the desktop app installers
bun run electron:build

# Package for multiple platforms
bun run electron:package
```

This will create installers in the `release` directory for your platform.

## Important Notes for Developers

- Web and Electron builds are kept separate to avoid conflicts
- Electron-specific code is in the `electron/` directory
- The app detects at runtime if it's running in Electron or a browser
- When making changes, test both environments to ensure compatibility
