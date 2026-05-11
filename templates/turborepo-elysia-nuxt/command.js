import { downloadTemplate } from 'giget';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { cyan, yellow, green, blue, red } from 'kolorist';
import runCommand from '../common/runCommand.js';

export default async function createTurborepoElysiaNuxtFromGithub(projectName, targetDir) {
    try {
        console.log(cyan(`\n🚀 Fetching TEN Project Template from GitHub...\n`));

        // 1. Download the template
        const spinner = ora(yellow('1. Downloading template...')).start();
        await downloadTemplate('github:krlan2789/lan-turbo-elysia-nuxt-template', {
            dir: targetDir,
            force: true,
        });
        spinner.succeed(green('1. Template downloaded!'));

        // 2. Update package.json name
        spinner.start(yellow('2. Personalizing project...'));
        const pkgPath = path.join(targetDir, 'package.json');
        if (await fs.pathExists(pkgPath)) {
            const pkg = await fs.readJson(pkgPath);
            pkg.name = projectName;
            await fs.writeJson(pkgPath, pkg, { spaces: 2 });
        }
        spinner.succeed(green('2. Project personalized!'));

        // 3. Install dependencies
        spinner.start(yellow('3. Installing dependencies with Bun...'));
        await runCommand('bun', ['install'], { cwd: targetDir, silent: true });
        spinner.succeed(green('3. Dependencies installed!'));

        console.log(green(`\n✅ ${projectName} is ready using your GitHub template!`));
        console.log(blue(`\nNext steps:`));
        console.log(`  cd ${projectName}`);
        console.log(`  bun dev`);
    } catch (err) {
        const spinner = ora().fail(red('Failed to download template.'));
        console.error(red('\n❌ Error:'), err.message);
    }
}
