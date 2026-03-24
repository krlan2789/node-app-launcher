import { blue, cyan, green, yellow, red } from 'kolorist';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import runCommand from '../common/runCommand.js';

export default async function createExpressPrismaProject(projectName, targetDir) {
    try {
        console.log(cyan(`\n📦 Building Express + Prisma (SQLite) Stack...\n`));

        await fs.ensureDir(targetDir);
        const opts = { cwd: targetDir };

        const spinner = ora(yellow('1. Initializing Project...')).start();
        await runCommand('bun', ['init', '-y'], { ...opts, silent: true });
        spinner.succeed(green('1. Project Initialized!'));

        spinner.start(yellow('2. Installing Express & Prisma...'));
        await runCommand('bun', ['add', 'express', '@prisma/client', 'dotenv'], { ...opts, silent: true });
        await runCommand('bun', ['add', '-d', 'typescript', 'tsx', 'prisma', '@types/express', '@types/node', '@types/better-sqlite3'], { ...opts, silent: true });
        spinner.succeed(green('2. Dependencies Installed!'));

        spinner.start(yellow('3. Initializing Prisma (SQLite)...'));
        await runCommand('bunx', ['prisma', 'init', '--datasource-provider', 'sqlite'], { ...opts, silent: true });

        // Add a basic User model to the generated schema.prisma
        const schemaPath = path.join(targetDir, 'prisma', 'schema.prisma');
        const schemaContent = `
generator client {
    provider = "prisma-client-js"
}

datasource db {
    provider = "sqlite"
    url      = "file:./dev.db"
}

model User {
    id    Int     @id @default(autoincrement())
    email String  @unique
    name  String?
}
`.trim();
        await fs.writeFile(schemaPath, schemaContent);
        spinner.succeed(green('3. Prisma Initialized with SQLite!'));

        spinner.start(yellow('4. Creating Boilerplate Files...'));
        await fs.ensureDir(path.join(targetDir, 'src'));
        await fs.ensureDir(path.join(targetDir, 'public'));

        const serverCode = `
import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();
router.get('/users', async (req, res) => {
    const users = await prisma.user.findMany();
    res.json(users);
});

router.post('/users', async (req, res) => {
    const { name, email } = req.body;
    const user = await prisma.user.create({
        data: { name, email },
    });
    res.json(user);
});

router.get('/', (req, res) => res.send('Express + Prisma is running.'));
export default router;
`.trim();
        await fs.writeFile(path.join(targetDir, 'src', 'main.ts'), serverCode);

        const entryCode = `
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import mainRoute from './src/main.ts';

dotenv.config();

const app = express();
const port = process.env.APP_PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(import.meta.dirname, "public")));

app.use('/', mainRoute);

app.listen(port, () => {
    console.log(\`🚀 Server: http://localhost:\${port}\`);
});
`.trim();
        await fs.writeFile(path.join(targetDir, 'index.ts'), entryCode);

        // Update package.json scripts
        const pkg = await fs.readJson(path.join(targetDir, 'package.json'));
        pkg.type = "module";
        pkg.scripts = {
            "dev": "bun --watch index.ts",
            "db:push": "bunx prisma db push",
            "db:studio": "bunx prisma studio"
        };
        await fs.writeJson(path.join(targetDir, 'package.json'), pkg, { spaces: 2 });
        spinner.succeed(green('4. Boilerplate Created!'));

        console.log(green(`\n✅ Project ${projectName} setup complete!`));
        console.log(blue(`\nNext steps:`));
        console.log(`  1. cd ${projectName}`);
        console.log(`  2. bun db:push  (To create the local SQLite database)`);
        console.log(`  3. bun dev`);
    } catch (err) {
        console.error(red('\n❌ Failed to build Prisma stack:'), err.message);
    }
}
