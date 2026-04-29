# Apify to GitHub Migrator

A simple Node.js CLI tool that automatically downloads the source code of your Apify Actors (built in the Apify Web IDE) and migrates them to new GitHub repositories.

## Features
- Fetches all actors you own from your Apify account.
- Skips actors already connected to an external Git repository.
- Downloads all source files for Web IDE-based actors.
- Automatically creates a new GitHub repository for each migrated actor.
- Initializes a local Git repository, commits the code, and pushes it to the newly created GitHub repository.

## Prerequisites
- Node.js (v14+ recommended)
- An **Apify API Token**
- A **GitHub Personal Access Token** (Classic token with `repo` scope or Fine-grained token with repository Read & Write permissions).

## Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/Peccer/apify-source-code-grabber.git
   cd apify-source-code-grabber
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration
1. Copy the example environment file to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Add your tokens to the `.env` file:
   ```env
   APIFY_TOKEN=your_apify_api_token
   GITHUB_TOKEN=your_github_personal_access_token
   ```

## Usage
Run the script using Node.js:
```bash
node index.js
```

### What happens when you run it?
1. The script will authenticate with GitHub and Apify.
2. It pulls a list of all your owned actors.
3. For each actor using the `SOURCE_FILES` (Web IDE) source type, it downloads the code to a local `output/` directory.
4. It then creates a private GitHub repository named after the actor.
5. Finally, it initializes Git, commits the code, and pushes it to the `main` branch of the new repository.

## License
ISC
