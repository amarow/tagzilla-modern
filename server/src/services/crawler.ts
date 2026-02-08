import { fileRepository, scopeRepository, searchRepository, appStateRepository } from '../db/repository';
import fs from 'fs';
import path from 'path';
const pdf = require('pdf-parse');
import mammoth from 'mammoth';

async function extractText(filePath: string, extension: string): Promise<string | null> {
    try {
        if (extension === '.pdf') {
            const dataBuffer = await fs.promises.readFile(filePath);
            const data = await pdf(dataBuffer);
            return data.text;
        } else if (extension === '.docx') {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
        } else {
            // Default text file
            return await fs.promises.readFile(filePath, 'utf8');
        }
    } catch (error) {
        console.error(`[CRAWLER] Failed to extract text from ${filePath}:`, error);
        return null;
    }
}

export const crawlerService = {
  async init() {
    console.log('[CRAWLER] Initializing in async mode...');
    const scopes = await scopeRepository.getAll();
    for (const s of scopes) {
        const scope = s as { id: number, path: string };
        console.log(`[CRAWLER] Triggering startup scan for scope ${scope.id} (${scope.path})`);
        this.scanScope(scope.id, scope.path).catch(err => {
             console.error(`[CRAWLER] Error scanning scope ${scope.id} on startup:`, err);
        });
    }
  },

  async addScope(userId: number, directoryPath: string) {
    if (!fs.existsSync(directoryPath)) {
      throw new Error(`Directory not found: ${directoryPath}`);
    }
    const scope = await scopeRepository.create(userId, directoryPath);
    this.scanScope(scope.id, directoryPath); 
    return scope;
  },

  async scanScope(scopeId: number, directoryPath: string) {
    console.log(`[CRAWLER] Starting async scan for scope ${scopeId}: ${directoryPath}`);
    
    const scopeObj = await scopeRepository.getById(scopeId) as { userId: number } | undefined;
    if (!scopeObj) { console.error(`[CRAWLER] Scope ${scopeId} not found`); return; }

    const appState = await appStateRepository.get(scopeObj.userId);
    const searchSettings = appState && appState.search_settings ? appState.search_settings : {};
    
    // Expanded default allowed extensions
    const allowedExtensions = searchSettings.allowedExtensions || 
        ['.txt', '.md', '.markdown', '.json', '.ts', '.js', '.jsx', '.tsx', '.html', '.css', '.scss', '.xml', '.yaml', '.yml', '.sql', '.env', '.pdf', '.docx'];
    
    let fileCount = 0;
    let ignoredCount = 0;
    const startTime = Date.now();
    const queue: { path: string, depth: number }[] = [{ path: directoryPath, depth: 0 }];

    const processQueue = async () => {
        if (queue.length === 0) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`[CRAWLER] Finished scan for scope ${scopeId}. Total: ${fileCount} files. Ignored: ${ignoredCount} items. Time: ${duration}s.`);
            return;
        }

        const current = queue.shift()!;
        
        try {
            const entries = await fs.promises.readdir(current.path, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(current.path, entry.name);
                
                if (entry.name.startsWith('.') || 
                    ['node_modules', 'dist', 'build', 'coverage', 'target', 'venv', '__pycache__'].includes(entry.name)) {
                    ignoredCount++;
                    continue;
                }

                if (entry.isDirectory()) {
                    if (current.depth < 20) {
                        queue.push({ path: fullPath, depth: current.depth + 1 });
                    } else {
                        console.log(`[CRAWLER] Max depth reached at ${fullPath}`);
                        ignoredCount++;
                    }
                } else if (entry.isFile()) {
                    try {
                        const stats = await fs.promises.stat(fullPath);
                        const fileId = await fileRepository.upsertFile(scopeId, fullPath, { 
                            size: stats.size, 
                            ctime: stats.ctime, 
                            mtime: stats.mtime 
                        });
                        
                        const ext = path.extname(fullPath).toLowerCase();
                        
                        // Limit: 20MB for binary, 5MB for text
                        const maxSize = (ext === '.pdf' || ext === '.docx') ? 20 * 1024 * 1024 : 5 * 1024 * 1024;

                        if (allowedExtensions.includes(ext) && stats.size < maxSize) {
                            try {
                                const content = await extractText(fullPath, ext);
                                if (content) {
                                    await searchRepository.indexContent(fileId, content);
                                }
                            } catch (err) {
                                console.error(`[CRAWLER] Failed to index content for ${fullPath}:`, err);
                            }
                        }
                        
                        fileCount++;
                        if (fileCount % 100 === 0) {
                            console.log(`[CRAWLER] Scope ${scopeId}: Processed ${fileCount} files...`);
                        }
                    } catch (err) {
                        // ignore individual file errors
                    }
                }
            }
        } catch (err) {
            console.error(`[CRAWLER] Error scanning ${current.path}:`, err);
        }

        // Use setImmediate to let the event loop breathe (handle UI requests)
        setImmediate(processQueue);
    };

    processQueue();
  }
};