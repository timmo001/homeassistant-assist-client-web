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

```bash
# Install dependencies
bun install

# Build and run desktop app in development mode
bun run electron:dev

# Package the desktop app for distribution
bun run electron:package
```

## Building

### Web App

```bash
# Build the web app
bun run build
```

### Desktop App

```bash
# Build the desktop app installers
bun run electron:build
```

This will create installers in the `release` directory for your platform.
