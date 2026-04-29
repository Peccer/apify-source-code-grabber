---
name: apify-source-code-grabber
description: A tool to automatically migrate Apify Web IDE actors to GitHub repositories.
version: 1.0.0
---

# Apify Source Code Grabber Skill

This skill automatically migrates your Apify Actors (created via the Web IDE) to new GitHub repositories, allowing you to transition easily from Apify to GitHub source control.

## Prerequisites
- **Node.js** must be installed.
- **Apify API Token**
- **GitHub Personal Access Token**

## Setup
1. Clone this repository.
2. Run `npm install` to install dependencies.
3. Copy `.env.example` to `.env` and fill in your `APIFY_TOKEN` and `GITHUB_TOKEN`.

## Usage
Run the following command to begin the migration:
```bash
node index.js
```

### What happens when you run it?
The script will find all your owned actors that use `SOURCE_FILES`, download them to a local `output/` directory, create a private GitHub repository for each, and push the code to the new repo.
