import chokidar from 'chokidar';
import { fileRepository, scopeRepository } from '../db/repository';
import fs from 'fs';

// Store active watchers to be able to close them if needed
const watchers: Record<number, chokidar.FSWatcher> = {};

export const crawlerService = {
  async init() {
    console.log('Initializing Crawler Service...');
    // Load all existing scopes (globally, for all users) and start watching
    const scopes = await scopeRepository.getAll(); // No userId passed = get all
    for (const scope of scopes) {
      this.startWatching(scope.id, scope.path);
    }
  },

  async addScope(userId: number, directoryPath: string) {
    // 1. Check if path exists
    if (!fs.existsSync(directoryPath)) {
      throw new Error(`Directory not found: ${directoryPath}`);
    }

    // 2. Add to DB
    const scope = await scopeRepository.create(userId, directoryPath);

    // 3. Start watching
    this.startWatching(scope.id, directoryPath);
    
    return scope;
  },

  startWatching(scopeId: number, directoryPath: string) {
    if (watchers[scopeId]) {
      console.log(`Watcher for scope ${scopeId} already exists.`);
      return;
    }

    console.log(`Starting watcher for scope ${scopeId}: ${directoryPath}`);

    const watcher = chokidar.watch(directoryPath, {
      ignored: /(^|[\]\/])\..*/, // ignore dotfiles
      persistent: true,
      depth: 10,
      ignoreInitial: false,
      awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100
      }
    });

    watcher
      .on('add', async (filePath, stats) => {
        try {
          if (!stats) return;
          await fileRepository.upsertFile(scopeId, filePath, { 
              size: stats.size, 
              ctime: stats.ctime, 
              mtime: stats.mtime 
          });
        } catch (error) {
          console.error(`Error processing file add: ${filePath}`, error);
        }
      })
      .on('change', async (filePath, stats) => {
        try {
          if (!stats) return;
          await fileRepository.upsertFile(scopeId, filePath, { 
              size: stats.size, 
              ctime: stats.ctime, 
              mtime: stats.mtime 
          });
        } catch (error) {
          console.error(`Error processing file change: ${filePath}`, error);
        }
      })
      .on('unlink', async (filePath) => {
        await fileRepository.removeFile(scopeId, filePath);
      })
      .on('error', error => console.error(`Watcher error: ${error}`));

    watchers[scopeId] = watcher;
  }
};