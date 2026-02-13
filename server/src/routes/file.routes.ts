import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth';
import { fileRepository } from '../db/repository';
import { db } from '../db/client';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import AdmZip from 'adm-zip';
import heicConvert from 'heic-convert';
import mammoth from 'mammoth';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
    const userId = (req as AuthRequest).user!.id;
    const start = Date.now();
    try {
        const files = await fileRepository.getAll(userId);
        console.log(`[API] Fetched ${files.length} files for user ${userId} in ${Date.now() - start}ms`);
        res.json(files);
    } catch (e: any) {
        console.error(`[API] Failed to fetch files: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
});

router.get('/:id/text-content', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { id } = req.params;
        
        const sql = `
            SELECT f.path, f.extension 
            FROM FileHandle f 
            JOIN Scope s ON f.scopeId = s.id 
            WHERE f.id = ? AND s.userId = ?
        `;
        const file = db.prepare(sql).get(id, userId) as { path: string, extension: string };
        
        if (!file) {
             res.status(404).json({ error: 'File not found or access denied' });
             return;
        }

        const ext = file.extension.toLowerCase();
        let text = "";

        if (ext === '.docx') {
            const result = await mammoth.extractRawText({ path: file.path });
            text = result.value;
        } else if (ext === '.odt') {
            const zip = new AdmZip(file.path);
            const contentXml = zip.readAsText('content.xml');
            if (contentXml) {
                let formatted = contentXml;
                
                // Paragraphs -> Newlines
                formatted = formatted.replace(/<text:p[^>]*>/g, '\n\n');
                
                // Headings -> Markdown headers based on level
                formatted = formatted.replace(/<text:h[^>]*text:outline-level="1"[^>]*>/g, '\n\n# ');
                formatted = formatted.replace(/<text:h[^>]*text:outline-level="2"[^>]*>/g, '\n\n## ');
                formatted = formatted.replace(/<text:h[^>]*text:outline-level="3"[^>]*>/g, '\n\n### ');
                // Fallback for headings without explicit level
                formatted = formatted.replace(/<text:h[^>]*>/g, '\n\n# ');
                
                // Tab -> spaces
                formatted = formatted.replace(/<text:tab\/>/g, '    ');
                
                // Line break -> newline
                formatted = formatted.replace(/<text:line-break\/>/g, '\n');

                // Strip all other tags
                text = formatted.replace(/<[^>]+>/g, '').trim();
            }
        } else {
            // For other files, just read as text
            text = await fs.readFile(file.path, 'utf8');
        }

        res.setHeader('Content-Type', 'text/plain');
        res.send(text);

    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/:id/content', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { id } = req.params;
        
        const sql = `
            SELECT f.path, f.mimeType, f.extension 
            FROM FileHandle f 
            JOIN Scope s ON f.scopeId = s.id 
            WHERE f.id = ? AND s.userId = ?
        `;
        const file = db.prepare(sql).get(id, userId) as { path: string, mimeType: string, extension: string };
        
        if (!file) {
             res.status(404).json({ error: 'File not found or access denied' });
             return;
        }

        // HEIC/HEIF Conversion to JPEG
        if (file.extension.toLowerCase() === '.heic' || file.extension.toLowerCase() === '.heif') {
            try {
                const inputBuffer = await fs.readFile(file.path);
                const outputBuffer = await heicConvert({
                    buffer: inputBuffer as any,
                    format: 'JPEG',
                    quality: 0.8
                });
                
                res.setHeader('Content-Type', 'image/jpeg');
                res.send(Buffer.from(outputBuffer));
                return;
            } catch (err) {
                console.error(`Failed to convert HEIC: ${err}`);
                // Fallback to sending original file if conversion fails
            }
        }

        // Optional: Set Content-Type header explicitly if needed, though sendFile usually handles it.
        // res.setHeader('Content-Type', file.mimeType);
        
        res.sendFile(file.path, { dotfiles: 'allow' }, (err) => {
             if (err) {
                 if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to send file' });
                 }
             }
        });

    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/:id/zip-content', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { id } = req.params;
        
        const sql = `
            SELECT f.path 
            FROM FileHandle f 
            JOIN Scope s ON f.scopeId = s.id 
            WHERE f.id = ? AND s.userId = ?
        `;
        const file = db.prepare(sql).get(id, userId) as { path: string };
        
        if (!file) {
             res.status(404).json({ error: 'File not found or access denied' });
             return;
        }

        const zip = new AdmZip(file.path);
        const zipEntries = zip.getEntries();
        
        const entries = zipEntries
            .filter(entry => !entry.isDirectory)
            .map(entry => ({
                name: entry.entryName,
                size: entry.header.size,
                compressedSize: entry.header.compressedSize,
                isDirectory: entry.isDirectory,
                path: entry.entryName,
                method: entry.header.method
            }));

        res.json(entries);
    } catch (e: any) {
        console.error("ZIP Error:", e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/:id/zip-entry', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { id } = req.params;
        const entryPath = req.query.path as string;

        if (!entryPath) {
            res.status(400).json({ error: 'Entry path is required' });
            return;
        }
        
        const sql = `
            SELECT f.path 
            FROM FileHandle f 
            JOIN Scope s ON f.scopeId = s.id 
            WHERE f.id = ? AND s.userId = ?
        `;
        const file = db.prepare(sql).get(id, userId) as { path: string };
        
        if (!file) {
             res.status(404).json({ error: 'File not found or access denied' });
             return;
        }

        const zip = new AdmZip(file.path);
        const entry = zip.getEntry(entryPath);

        if (!entry) {
            res.status(404).json({ error: 'Entry not found in zip' });
            return;
        }

        if (entry.isDirectory) {
            res.status(400).json({ error: 'Cannot download a directory' });
            return;
        }

        const buffer = entry.getData();
        
        // Try to detect mime type simply by extension
        const ext = path.extname(entry.entryName).toLowerCase();
        let contentType = 'application/octet-stream';
        if (['.txt', '.md', '.json', '.js', '.ts', '.css', '.html', '.xml'].includes(ext)) contentType = 'text/plain';
        if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
        if (['.png'].includes(ext)) contentType = 'image/png';
        if (['.pdf'].includes(ext)) contentType = 'application/pdf';

        res.setHeader('Content-Type', contentType);
        res.send(buffer);

    } catch (e: any) {
        console.error("ZIP Entry Error:", e);
        res.status(500).json({ error: e.message });
    }
});

router.post('/:id/open', authenticateToken, async (req, res) => {
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

        if (process.platform === 'linux' && file.extension === '.pdf') {
            command = 'evince';
            args.push(file.path);
        } else {
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
router.post('/:id/tags', authenticateToken, async (req, res) => {
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

router.post('/bulk-tags', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { fileIds, tagName } = req.body;
        if (!fileIds || !Array.isArray(fileIds) || !tagName) {
             res.status(400).json({ error: 'Invalid payload' });
             return;
        }
        const result = await fileRepository.addTagToFiles(userId, fileIds, tagName);
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/bulk-tags', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { fileIds, tagId } = req.body;
        if (!fileIds || !Array.isArray(fileIds) || !tagId) {
             res.status(400).json({ error: 'Invalid payload' });
             return;
        }
        const result = await fileRepository.removeTagFromFiles(userId, fileIds, Number(tagId));
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/:fileId/tags/:tagId', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { fileId, tagId } = req.params;
        const updatedFile = await fileRepository.removeTagFromFile(userId, Number(fileId), Number(tagId));
        res.json(updatedFile);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
