import { blue, cyan, green, yellow, red } from 'kolorist';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import runCommand from '../common/runCommand.js';

export default async function createExpressRabbitMQProject(projectName, targetDir) {
    try {
        console.log(cyan(`\n📦 Building Custom Bun + Express + RabbitMQ Stack...\n`));

        await fs.ensureDir(targetDir);
        const opts = { cwd: targetDir };

        const spinner = ora(yellow('1. Initializing Project...')).start();
        await runCommand('bun', ['init', '-y'], { ...opts, silent: true });
        spinner.succeed(green('1. Project Initialized!'));

        spinner.start(yellow('2. Installing Dependencies (Express, RabbitMQ)...'));
        await runCommand('bun', ['add', 'express', 'amqplib', 'dotenv'], { ...opts, silent: true });
        await runCommand('bun', ['add', '-d', '@types/express', '@types/node', '@types/amqplib'], { ...opts, silent: true });
        spinner.succeed(green('2. Dependencies Installed via Bun!'));

        spinner.start(yellow('3. Creating Boilerplate Files...'));
        await fs.ensureDir(path.join(targetDir, 'src'));
        await fs.ensureDir(path.join(targetDir, 'public'));

        const serverCode = `
import express from 'express';
import dotenv from 'dotenv';
import amqp from 'amqplib';

dotenv.config();

const router = express.Router();
const amqHost = process.env.AMQP_HOST || 'amqp://localhost';

router.get('/', (req, res) => res.send('Bun + Express + RabbitMQ is running.'));

// AMQP Initialization
export async function startAMQ() {
    try {
        const connection = await amqp.connect(amqHost);
        const channel = await connection.createChannel();
        console.log('✅ Connected to RabbitMQ');
        return channel;
    } catch (e: any) {
        console.log('❌ RabbitMQ not running: ' + e.message);
    }
}

export default router;
`.trim();
        await fs.writeFile(path.join(targetDir, 'src', 'main.ts'), serverCode);

        const entryCode = `
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import mainRoute, { startAMQ } from './src/main.ts';

dotenv.config();

const app = express();
const port = process.env.APP_PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(import.meta.dirname, "public")));

// Routes
app.use('/', mainRoute);

app.listen(port, async () => {
    console.log(\`🚀 Server: http://localhost:\${port}\`);
    await startAMQ();
});
`.trim();
        await fs.writeFile(path.join(targetDir, 'index.ts'), entryCode);

        // Create Env File
        const envValues = `
APP_PORT=4141
AMQP_HOST=amqp://localhost
`.trim();
        await fs.writeFile(path.join(targetDir, '.env'), envValues);

        // --- FIXED package.json scripts ---
        const pkg = await fs.readJson(path.join(targetDir, 'package.json'));
        pkg.type = "module";
        pkg.scripts = {
            "dev": "bun --watch index.ts",  // FIXED: pointing to root index.ts
            "start": "bun index.ts",
            "build": "bun build ./index.ts --outdir ./dist"
        };

        await fs.writeJson(path.join(targetDir, 'package.json'), pkg, { spaces: 2 });
        spinner.succeed(green('3. Boilerplate & Scripts Created!'));

        console.log(green(`\n✅ Project ${projectName} setup complete!`));
        console.log(blue(`\nNext steps:`));
        console.log(`  cd ${projectName}`);
        console.log(`  bun dev`);
    } catch (err) {
        console.error(red('\n❌ Failed to build custom stack:'), err.message);
    }
}
