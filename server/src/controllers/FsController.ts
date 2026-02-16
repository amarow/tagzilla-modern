import { Request, Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const FsController = {
    async pickDirectory(req: Request, res: Response) {
        try {
            let command = '';
            if (process.platform === 'linux') {
                command = 'zenity --file-selection --directory --title="Select Directory to Watch"';
            } else if (process.platform === 'win32') {
                command = 'powershell -command "& { $App = New-Object -ComObject Shell.Application; $Folder = $App.BrowseForFolder(0, \'Select Directory to Watch\', 0); if ($Folder) { $Folder.Self.Path } }"';
            } else if (process.platform === 'darwin') {
                command = 'osascript -e "POSIX path of (choose folder with prompt \\"Select Directory to Watch\\")"';
            }

            if (!command) {
                return res.status(501).json({ error: 'Directory picker not supported on this platform' });
            }

            const { stdout } = await execAsync(command);
            const selectedPath = stdout.trim();
            
            if (!selectedPath) return res.status(204).end(); // User cancelled

            res.json({ path: selectedPath });
        } catch (e: any) {
            if (e.code === 1) return res.status(204).end(); // User cancelled zenity
            res.status(500).json({ error: e.message });
        }
    },

    async list(req: Request, res: Response) {
        try {
            let dirPath = req.query.path as string;
            if (!dirPath) dirPath = os.homedir();

            try {
                await fs.access(dirPath, fs.constants.R_OK);
            } catch {
                 return res.status(403).json({ error: 'Access denied or path invalid' });
            }

            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            const directories = entries
                .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
                .map(entry => ({
                    name: entry.name,
                    path: path.join(dirPath, entry.name),
                    isDir: true
                }))
                .sort((a, b) => a.name.localeCompare(b.name));
                
            const parentDir = path.dirname(dirPath);
            if (parentDir !== dirPath) {
                 directories.unshift({
                     name: '..',
                     path: parentDir,
                     isDir: true
                 });
            }

            res.json({ currentPath: dirPath, entries: directories });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }
};
