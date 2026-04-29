import 'dotenv/config';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { simpleGit } from 'simple-git';
import { Octokit } from '@octokit/rest';

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!APIFY_TOKEN || !GITHUB_TOKEN) {
  console.error('Error: APIFY_TOKEN and GITHUB_TOKEN must be set in the .env file.');
  process.exit(1);
}

const apifyApi = axios.create({
  baseURL: 'https://api.apify.com/v2',
  headers: {
    Authorization: `Bearer ${APIFY_TOKEN}`,
  },
});

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

async function main() {
  try {
    // 1. Get authenticated GitHub user
    const { data: ghUser } = await octokit.rest.users.getAuthenticated();
    const githubUsername = ghUser.login;
    console.log(`Authenticated with GitHub as: ${githubUsername}`);

    // 2. Fetch all actors owned by the user
    console.log('Fetching Apify actors...');
    const actsRes = await apifyApi.get('/acts', { params: { my: 1 } });
    const actors = actsRes.data.data.items;
    
    if (!actors || actors.length === 0) {
      console.log('No actors found.');
      return;
    }

    console.log(`Found ${actors.length} actors owned by you.`);

    const outputDir = path.resolve('./output');
    await fs.ensureDir(outputDir);

    for (const actor of actors) {
      console.log(`\n--- Processing Actor: ${actor.name} (${actor.id}) ---`);
      
      // Get all versions for the actor
      const versionsRes = await apifyApi.get(`/acts/${actor.id}/versions`);
      const versions = versionsRes.data.data.items;

      if (!versions || versions.length === 0) {
        console.log(`No versions found for ${actor.name}. Skipping.`);
        continue;
      }

      // Pick the 'latest' tagged version or the most recently updated one
      let targetVersion = versions.find(v => v.buildTag === 'latest') || versions[versions.length - 1];
      
      if (targetVersion.sourceType === 'GIT_REPO') {
        console.log(`Actor ${actor.name} uses GIT_REPO. Skipping as requested.`);
        continue;
      }

      if (targetVersion.sourceType !== 'SOURCE_FILES') {
        console.log(`Actor ${actor.name} uses ${targetVersion.sourceType}. Skipping.`);
        continue;
      }

      // Fetch the specific version details to get the source files content
      console.log(`Fetching source code for version ${targetVersion.versionNumber}...`);
      const versionDetailsRes = await apifyApi.get(`/acts/${actor.id}/versions/${targetVersion.versionNumber}`);
      const versionDetails = versionDetailsRes.data.data;

      const sourceFiles = versionDetails.sourceFiles || [];
      if (sourceFiles.length === 0) {
        console.log(`No source files found for ${actor.name} version ${targetVersion.versionNumber}.`);
        continue;
      }

      // Create local folder
      const actorDir = path.join(outputDir, actor.name);
      console.log(`Saving code to ${actorDir}...`);
      
      // Clean directory if it already exists, or just ensure it exists
      await fs.emptyDir(actorDir);

      // Write files
      for (const file of sourceFiles) {
        if (file.folder) continue; // It's just a directory marker

        const filePath = path.join(actorDir, file.name);
        await fs.ensureDir(path.dirname(filePath));

        if (file.format === 'BASE64') {
          await fs.writeFile(filePath, Buffer.from(file.content, 'base64'));
        } else {
          await fs.writeFile(filePath, file.content, 'utf8');
        }
      }

      console.log(`Code saved locally.`);

      // Create GitHub repository
      let repoUrl;
      try {
        console.log(`Creating GitHub repository: ${actor.name}...`);
        const repoRes = await octokit.rest.repos.createForAuthenticatedUser({
          name: actor.name,
          private: true,
          description: `Apify Actor Migrated from Web IDE`,
        });
        repoUrl = repoRes.data.clone_url;
        console.log(`Repository created: ${repoUrl}`);
      } catch (err) {
        if (err.status === 422 && err.response?.data?.errors?.some(e => e.message === 'name already exists on this account')) {
          console.log(`Repository ${actor.name} already exists on GitHub.`);
          repoUrl = `https://github.com/${githubUsername}/${actor.name}.git`;
        } else {
          console.error(`Error creating repository for ${actor.name}:`, err.message);
          continue;
        }
      }

      // Git init, commit, and push
      try {
        console.log(`Initializing git repository and pushing to GitHub...`);
        const git = simpleGit(actorDir);
        await git.init();
        await git.add('./*');
        
        // Ensure default branch is main
        await git.branch(['-M', 'main']);

        // Check if there's anything to commit
        const status = await git.status();
        if (status.staged.length > 0) {
          await git.commit('Initial commit from Apify migrator');
          
          // Construct URL with auth token for pushing
          const pushUrl = `https://${GITHUB_TOKEN}@github.com/${githubUsername}/${actor.name}.git`;
          
          // Check if remote already exists, add or set it
          const remotes = await git.getRemotes();
          if (remotes.some(r => r.name === 'origin')) {
            await git.remote(['set-url', 'origin', pushUrl]);
          } else {
            await git.addRemote('origin', pushUrl);
          }

          console.log(`Pushing code to GitHub...`);
          await git.push(['-u', 'origin', 'main']);
          console.log(`Successfully migrated ${actor.name} to GitHub!`);
        } else {
          console.log(`No new files to commit for ${actor.name}.`);
        }
      } catch (err) {
        console.error(`Failed to push to GitHub for ${actor.name}:`, err.message);
      }
    }

    console.log('\n--- Migration complete ---');
  } catch (error) {
    console.error('An error occurred during the migration process:');
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

main();
