#!/usr/bin/env node

import prompts from 'prompts';
import { spawn } from 'cross-spawn';
import { blue, cyan, green, bold, yellow, red } from 'kolorist';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';

// --- HELPER: Run a command and wait for it to finish ---
async function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: 'inherit',
            shell: true,
            ...options
        });
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
        });
    });
}

async function createExpressRabbitMQProject(projectName, targetDir) {
    try {
        console.log(cyan(`\n📦 Building Custom Express + RabbitMQ Stack...\n`));

        await fs.ensureDir(targetDir);
        const opts = { cwd: targetDir };

        // console.log(yellow('1. Initializing Project...'));
        const spinner = ora(yellow('1. Initializing Project...')).start();
        await runCommand('npm', ['init', '-y'], opts);
        spinner.succeed(green('1. Project Initialized!'));

        // console.log(yellow('2. Installing Dependencies (Express, RabbitMQ, TS)...'));
        spinner.start(yellow('2. Installing Dependencies (Express, RabbitMQ, TS)...'));
        await runCommand('npm', ['install', 'express', 'amqplib', 'dotenv'], opts);
        await runCommand('npm', ['install', '-D', 'typescript', '@types/express', '@types/node', '@types/amqplib', 'ts-node'], opts);
        spinner.succeed(green('2. Dependencies Installed!'));

        // console.log(yellow('3. Configuring TypeScript...'));
        spinner.start(yellow('3. Configuring TypeScript...'));
        await runCommand('npx', ['tsc', '--init'], opts);
        spinner.succeed(green('3. TypeScript Configured!'));

        // console.log(yellow('4. Creating Boilerplate Files...'));
        spinner.start(yellow('4. Creating Boilerplate Files...'));
        await fs.ensureDir(path.join(targetDir, 'src'));

        const serverCode = `
import express from 'express';
import amqp from 'amqplib';

const app = express();
const port = process.env.PORT || 3000;
const amqHost = process.env.AMQ_HOST || 'amqp://localhost';

async function startRabbit() {
    try {
        const connection = await amqp.connect(amqHost);
        const channel = await connection.createChannel();
        console.log('✅ Connected to RabbitMQ');
        return channel;
    } catch (e) {
        console.log('❌ RabbitMQ not running. Please start it with Docker or local install.');
    }
}

app.get('/', (req, res) => res.send('API is running.'));

app.listen(port, async () => {
    console.log(\`🚀 Server: http://localhost:\${port}\`);
    await startRabbit();
});`.trim();

        await fs.writeFile(path.join(targetDir, 'src', 'index.ts'), serverCode);

        // Update scripts in package.json
        const pkg = await fs.readJson(path.join(targetDir, 'package.json'));
        pkg.scripts = {
            "build": "run-p type-check \"build-only {@}\" --",
            "predeploy": "npm run build",
            "deploy": "tsc",
            "watch": "ts-node --watch src/index.ts",
            "start:dev": "ts-node --respawn --transpile-only src/index.ts",
            "start:prod": "node dist/index.js",
        };
        await fs.writeJson(path.join(targetDir, 'package.json'), pkg, { spaces: 2 });
        spinner.succeed(green('4. Boilerplate Files Created!'));

        console.log(green(`\n✅ Project ${projectName} setup complete!`));
        console.log(blue(`\nNext steps:`));
        console.log(`  cd ${projectName}`);
        console.log(`  npm run dev`);

    } catch (err) {
        console.error(red('\n❌ Failed to build custom stack:'), err.message);
    }
}

async function init() {
    console.log(bold(cyan('\n🛠  LAN Project Launcher\n')));

    const response = await prompts([
        {
            type: 'text',
            name: 'projectName',
            message: 'Project name:',
            initial: 'project-name'
        },
        {
            type: 'select',
            name: 'framework',
            message: 'Which generator would you like to use?',
            choices: [
                {
                    title: 'Vue',
                    value: { type: 'spawn', command: 'npm', args: ['create', 'vue@latest'] }
                },
                {
                    title: 'Nuxt',
                    value: { type: 'spawn', command: 'npm', args: ['create', 'nuxt@latest'] }
                },
                {
                    title: 'Vite (Vue/React/Svelte)',
                    value: { type: 'spawn', command: 'npm', args: ['create', 'vite@latest'] }
                },
                {
                    title: 'Express + Prisma ORM',
                    value: { type: 'spawn', command: 'npx', args: ['try-prisma@latest', '--template', 'orm/express', '--install', 'npm', '--name', 'express'] }
                },
                {
                    title: 'NestJS CLI',
                    value: { type: 'spawn', command: 'npx', args: ['@nestjs/cli', 'new'] }
                },
                // --- NEW CUSTOM STRATEGY OPTION ---
                {
                    title: 'Express + RabbitMQ (AMQP)',
                    value: { type: 'custom', id: 'express-amq' }
                },
            ],
        }
    ]);

    const { projectName, framework } = response;

    if (!projectName || !framework) {
        console.log('Operation cancelled');
        return;
    }

    const targetDir = path.join(process.cwd(), projectName);

    // --- STRATEGY 1: Standard Spawn (Wrappers) ---
    if (framework.type === 'spawn') {
        console.log(blue(`\n🚀 Launching ${framework.command} ${framework.args.join(' ')}...\n`));
        const fullArgs = [...framework.args, projectName];

        const child = spawn(framework.command, fullArgs, {
            stdio: 'inherit',
            shell: true
        });

        child.on('close', (code) => {
            if (code === 0) console.log(green(`\n✅ ${projectName} initialized successfully!`));
            else console.log(bold(red('\n❌ Generator exited with an error.')));
        });
    }
    // --- STRATEGY 2: Custom Sequence (Express + RabbitMQ) ---
    else if (framework.type === 'custom') {
        switch (framework.id) {
            case 'express-amq':
                await createExpressRabbitMQProject(projectName, targetDir);
                break;
        }
    }
}

init().catch(console.error);