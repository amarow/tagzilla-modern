import express from 'express';
import cors from 'cors';
import { db } from './db/client';
import { crawlerService } from './services/crawler';
import { scopeRepository, fileRepository, tagRepository, appStateRepository } from './db/repository';
import { exec, spawn } from 'child_process';
import { authService, authenticateToken, AuthRequest } from './auth';
import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';

const app = express();
const PORT = process.env.PORT || 3001;

console.log("!!! SERVER STARTUP - ASYNC CRAWLER VERSION " + Date.now() + " !!!");

app.use(cors());
app.use(express.json());

// --- Public Routes ---

app.get('/', (req, res) => {
  res.send('Tagzilla Backend is running!');
});

// FS Listing for Directory Chooser
app.get('/api/fs/list', authenticateToken, async (req, res) => {
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

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
        await authService.register(username, password);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await authService.login(username, password);
        if (!result) return res.status(401).json({ error: 'Invalid credentials' });
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- Protected Routes ---

app.get('/status', authenticateToken, async (req, res) => {
  try {
    const fileCount = db.prepare('SELECT COUNT(*) as count FROM FileHandle').get() as { count: number };
    const scopeCount = db.prepare('SELECT COUNT(*) as count FROM Scope').get() as { count: number };
    res.json({ status: 'ok', fileCount: fileCount.count, scopeCount: scopeCount.count });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Preferences
app.get('/api/preferences', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const prefs = await appStateRepository.get(userId);
        res.json(prefs || {});
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/preferences', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        await appStateRepository.set(userId, req.body);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Scopes
app.get('/api/scopes', authenticateToken, async (req, res) => {
    const userId = (req as AuthRequest).user!.id;
    const scopes = await scopeRepository.getAll(userId);
    res.json(scopes);
});

app.post('/api/scopes', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { path } = req.body;
        if (!path) {
             res.status(400).json({ error: 'Path is required' });
             return;
        }
        const scope = await crawlerService.addScope(userId, path);
        res.json(scope);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/scopes/:id/refresh', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { id } = req.params;
        console.log(`[API] Refresh requested for scope ${id} by user ${userId}`);
        const scope = await scopeRepository.getById(Number(id)) as any;
        if (!scope || scope.userId !== userId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        // Trigger scan in background (Fire and Forget)
        console.log(`[API] Triggering background scan for scope ${id}`);
        crawlerService.scanScope(scope.id, scope.path).catch(err => {
            console.error(`[API] Background scan failed for scope ${scope.id}:`, err);
        });
        
        res.json({ success: true, message: 'Scan started in background' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/scopes/:id', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { id } = req.params;
        await scopeRepository.delete(userId, Number(id));
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Files
app.get('/api/files', authenticateToken, async (req, res) => {
    const userId = (req as AuthRequest).user!.id;
    const files = await fileRepository.getAll(userId);
    res.json(files);
});

app.post('/api/files/:id/open', authenticateToken, async (req, res) => {
    try {
        // TODO: Ensure file belongs to user (scope check) - implicitly safe via local exec but good practice
        const { id } = req.params;
        const file: any = db.prepare('SELECT * FROM FileHandle WHERE id = ?').get(id);
        
        if (!file) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        let command = '';
        const args: string[] = [];

        // On Linux/Ubuntu, 'gio open' is often more reliable than 'xdg-open' for desktop apps
        switch (process.platform) {
            case 'darwin': 
                command = 'open'; 
                args.push(file.path);
                break;
            case 'win32': 
                command = 'cmd'; 
                args.push('/c', 'start', '""', file.path);
                break;
            default: 
                // Try gio open first (GNOME), fallback to xdg-open if needed?
                // Actually xdg-open delegates to gio open, but let's be explicit if we can.
                // For now, let's stick to xdg-open but ensure env is passed correctly.
                command = 'xdg-open'; 
                args.push(file.path);
                break;
        }

        console.log(`Attempting to open file: "${file.path}"`);
        
        // Aggressive environment sanitization: Only pass essential vars.
        // This strips all Snap/Library specific vars that cause GLIBC errors.
        const cleanEnv: NodeJS.ProcessEnv = {
            PATH: process.env.PATH,
            HOME: process.env.HOME,
            DISPLAY: process.env.DISPLAY || ':0',
            USER: process.env.USER,
            LANG: process.env.LANG,
            DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS,
            XAUTHORITY: process.env.XAUTHORITY,
            XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR,
            XDG_DATA_DIRS: process.env.XDG_DATA_DIRS,
            XDG_CONFIG_DIRS: process.env.XDG_CONFIG_DIRS
        };

        // Use 'inherit' for stdio to see errors in the server console
        const child = spawn(command, args, {
            detached: true,
            stdio: 'inherit', 
            env: cleanEnv 
        });

        child.on('error', (err) => {
             console.error(`Failed to spawn viewer: ${err.message}`);
        });
        
        child.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Viewer process exited with code ${code}`);
            }
        });

        child.unref(); 
        
        res.json({ success: true, message: 'File opening initiated' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Tags Logic
app.post('/api/files/:id/tags', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { id } = req.params;
        const { tagName } = req.body;
        if (!tagName) {
            res.status(400).json({ error: 'Tag name is required' });
            return;
        }
        const updatedFile = await fileRepository.addTagToFile(userId, Number(id), tagName);
        res.json(updatedFile);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/files/:fileId/tags/:tagId', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { fileId, tagId } = req.params;
        const updatedFile = await fileRepository.removeTagFromFile(userId, Number(fileId), Number(tagId));
        res.json(updatedFile);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/tags', authenticateToken, async (req, res) => {
    const userId = (req as AuthRequest).user!.id;
    const tags = await tagRepository.getAll(userId);
    res.json(tags);
});

app.post('/api/tags', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { name, color } = req.body;
        if (!name) {
            res.status(400).json({ error: 'Tag name is required' });
            return;
        }
        const tag = await tagRepository.create(userId, name, color);
        res.json(tag);
    } catch (e: any) {
        if (e.code === 'P2002') {
             res.status(409).json({ error: 'Tag already exists' });
             return;
        }
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/tags/:id', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { id } = req.params;
        await tagRepository.delete(userId, Number(id));
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Start Server & Crawler
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await crawlerService.init();
});
