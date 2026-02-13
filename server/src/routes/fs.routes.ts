import { Router } from 'express';
import { authenticateToken } from '../auth';
import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';

const router = Router();

router.get('/list', authenticateToken, async (req, res) => {
    try {
        let dirPath = req.query.path as string;
        
        // Default to Home dir if no path provided
        if (!dirPath) {
            dirPath = os.homedir();
        }

        // Security check (basic): ensure we can read it
        try {
            await fs.access(dirPath, fs.constants.R_OK);
        } catch {
             res.status(403).json({ error: 'Access denied or path invalid' });
             return;
        }

        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        const directories = entries
            .filter(entry => entry.isDirectory() && !entry.name.startsWith('.')) // Hide hidden folders for simplicity
            .map(entry => ({
                name: entry.name,
                path: path.join(dirPath, entry.name),
                isDir: true
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
            
        // Add parent directory entry if not at root
        const parentDir = path.dirname(dirPath);
        if (parentDir !== dirPath) {
             directories.unshift({
                 name: '..',
                 path: parentDir,
                 isDir: true
             });
        }

        res.json({
            currentPath: dirPath,
            entries: directories
        });

    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
