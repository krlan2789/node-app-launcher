import { spawn } from 'cross-spawn';

// --- HELPER: Run a command and wait for it to finish ---
export default async function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: options.silent ? 'ignore' : 'inherit', // Hide output if silent is requested
            shell: true,
            ...options
        });
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
        });
    });
}
