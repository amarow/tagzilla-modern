"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlerService = void 0;
const chokidar_1 = __importDefault(require("chokidar"));
const repository_1 = require("../db/repository");
const fs_1 = __importDefault(require("fs"));
// Store active watchers to be able to close them if needed
const watchers = {};
exports.crawlerService = {
    async init() {
        console.log('Initializing Crawler Service...');
        // Load all existing scopes (globally, for all users) and start watching
        const scopes = await repository_1.scopeRepository.getAll(); // No userId passed = get all
        for (const scope of scopes) {
            this.startWatching(scope.id, scope.path);
        }
    },
    async addScope(userId, directoryPath) {
        // 1. Check if path exists
        if (!fs_1.default.existsSync(directoryPath)) {
            throw new Error(`Directory not found: ${directoryPath}`);
        }
        // 2. Add to DB
        const scope = await repository_1.scopeRepository.create(userId, directoryPath);
        // 3. Start watching
        this.startWatching(scope.id, directoryPath);
        return scope;
    },
    startWatching(scopeId, directoryPath) {
        if (watchers[scopeId]) {
            console.log(`Watcher for scope ${scopeId} already exists.`);
            return;
        }
        console.log(`Starting watcher for scope ${scopeId}: ${directoryPath}`);
        const watcher = chokidar_1.default.watch(directoryPath, {
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
                if (!stats)
                    return;
                await repository_1.fileRepository.upsertFile(scopeId, filePath, {
                    size: stats.size,
                    ctime: stats.ctime,
                    mtime: stats.mtime
                });
            }
            catch (error) {
                console.error(`Error processing file add: ${filePath}`, error);
            }
        })
            .on('change', async (filePath, stats) => {
            try {
                if (!stats)
                    return;
                await repository_1.fileRepository.upsertFile(scopeId, filePath, {
                    size: stats.size,
                    ctime: stats.ctime,
                    mtime: stats.mtime
                });
            }
            catch (error) {
                console.error(`Error processing file change: ${filePath}`, error);
            }
        })
            .on('unlink', async (filePath) => {
            await repository_1.fileRepository.removeFile(scopeId, filePath);
        })
            .on('error', error => console.error(`Watcher error: ${error}`));
        watchers[scopeId] = watcher;
    }
};
