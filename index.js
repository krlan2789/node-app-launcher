#!/usr/bin/env node

import prompts from 'prompts';
import { spawn } from 'cross-spawn';
import { blue, cyan, green, bold, red } from 'kolorist';
import path from 'path';
import createExpressRabbitMQProject from './templates/express-rabbitmq/command.js';
import createExpressPrismaProject from './templates/express-prisma/command.js';
import createNuxtPrimeTailwindFromGithub from './templates/nuxt-prime-tailwind/command.js';

async function init() {
    console.log(bold(cyan('\n🛠  LAN Project Launcher (Bun Edition)\n')));

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
                    value: { type: 'spawn', command: 'bun', args: ['create', 'vue@latest'] }
                },
                {
                    title: 'Nuxt',
                    value: { type: 'spawn', command: 'bun', args: ['create', 'nuxt@latest'] }
                },
                {
                    title: 'Vite',
                    value: { type: 'spawn', command: 'bun', args: ['create', 'vite'] }
                },
                {
                    title: 'NestJS CLI (NPM)',
                    value: { type: 'spawn', command: 'npx', args: ['@nestjs/cli', 'new'] }
                },
                {
                    title: 'ElysiaJS CLI (Bun)',
                    value: { type: 'spawn', command: 'bun', args: ['create', 'elysia'] }
                },
                {
                    title: 'Express + Prisma ORM (SQLite)',
                    value: { type: 'custom', id: 'express-prisma' }
                },
                {
                    title: 'Express + RabbitMQ',
                    value: { type: 'custom', id: 'express-amq' }
                },
                {
                    title: 'Nuxt 4 + PrimeVue 4 + Tailwind 4',
                    value: { type: 'custom', id: 'nuxt-prime-tailwind' }
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
    else if (framework.type === 'custom') {
        switch (framework.id) {
            case 'express-amq':
                await createExpressRabbitMQProject(projectName, targetDir);
                break;
            case 'express-prisma':
                await createExpressPrismaProject(projectName, targetDir);
                break;
            case 'nuxt-prime-tailwind':
                await createNuxtPrimeTailwindFromGithub(projectName, targetDir);
                break;
        }
    }
}

init().catch(console.error);
