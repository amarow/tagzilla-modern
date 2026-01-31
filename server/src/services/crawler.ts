import { fileRepository, scopeRepository } from '../db/repository';
import fs from 'fs';
import path from 'path';

export const crawlerService = {
  async init() {
    console.log('[CRAWLER] Initializing in async mode...');
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
                        await fileRepository.upsertFile(scopeId, fullPath, { 
                            size: stats.size, 
                            ctime: stats.ctime, 
                            mtime: stats.mtime 
                        });
                        
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