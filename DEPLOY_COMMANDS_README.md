# Deploy Commands Script

## Overview

The `deploy-commands.js` script is used to deploy Discord slash commands to either a specific guild or globally.

## Usage

```bash
node deploy-commands.js [options]
```

## Options

- `-g, --global`: Deploy commands globally (default: false)
- `-s, --guild <guild_id>`: Deploy commands to a specific guild (if not provided, uses GUILD_ID from .env)
- `-d, --delete <command_id>`: Delete a command by ID
- `-e, --env <environment>`: Environment to deploy to (choices: "dev", "prod", default: "prod")
- `-t, --token <token_var>`: Token environment variable to use (overrides env option)
- `-c, --clientId <client_id_var>`: Client ID environment variable to use (overrides env option)
- `-h, --help`: Show help

## Environment Variables

Make sure to set up your `.env` file with the following variables:

```
# Production environment
DISCORD_TOKEN=your_production_token
CLIENT_ID=your_production_client_id

# Development environment
DISCORD_TOKEN_DEV=your_development_token
CLIENT_ID_DEV=your_development_client_id

# Common variables
GUILD_ID=your_guild_id
```

## Examples

### Deploy to development environment

```bash
node deploy-commands.js --env dev
```

### Deploy to production environment (default)

```bash
node deploy-commands.js
```

or

```bash
node deploy-commands.js --env prod
```

### Deploy globally to development environment

```bash
node deploy-commands.js --env dev --global
```

### Delete a command in development environment

```bash
node deploy-commands.js --env dev --delete <command_id>
```
