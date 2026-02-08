"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlerService = void 0;
const repository_1 = require("../db/repository");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.crawlerService = {
    async init() {
        console.log('[CRAWLER] Initializing in async mode...');
    },
    async addScope(userId, directoryPath) {
        if (!fs_1.default.existsSync(directoryPath)) {
            throw new Error(`Directory not found: ${directoryPath}`);
        }
        const scope = await repository_1.scopeRepository.create(userId, directoryPath);
        this.scanScope(scope.id, directoryPath);
        return scope;
    },
    async scanScope(scopeId, directoryPath) {
        console.log(`[CRAWLER] Starting async scan for scope ${scopeId}: ${directoryPath}`);
        const scopeObj = await repository_1.scopeRepository.getById(scopeId);
        if (!scopeObj) {
            console.error(`[CRAWLER] Scope ${scopeId} not found`);
            return;
        }
        const appState = await repository_1.appStateRepository.get(scopeObj.userId);
        const searchSettings = appState && appState.search_settings ? appState.search_settings : {};
        const allowedExtensions = searchSettings.allowedExtensions ||
            ['.txt', '.md', '.markdown', '.json', '.ts', '.js', '.jsx', '.tsx', '.html', '.css', '.scss', '.xml', '.yaml', '.yml', '.sql', '.env'];
        let fileCount = 0;
        let ignoredCount = 0;
        const startTime = Date.now();
        const queue = [{ path: directoryPath, depth: 0 }];
        const processQueue = async () => {
            if (queue.length === 0) {
                const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                console.log(`[CRAWLER] Finished scan for scope ${scopeId}. Total: ${fileCount} files. Ignored: ${ignoredCount} items. Time: ${duration}s.`);
                return;
            }
            const current = queue.shift();
            try {
                const entries = await fs_1.default.promises.readdir(current.path, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path_1.default.join(current.path, entry.name);
                    if (entry.name.startsWith('.') ||
                        ['node_modules', 'dist', 'build', 'coverage', 'target', 'venv', '__pycache__'].includes(entry.name)) {
                        ignoredCount++;
                        continue;
                    }
                    if (entry.isDirectory()) {
                        if (current.depth < 20) {
                            queue.push({ path: fullPath, depth: current.depth + 1 });
                        }
                        else {
                            console.log(`[CRAWLER] Max depth reached at ${fullPath}`);
                            ignoredCount++;
                        }
                    }
                    else if (entry.isFile()) {
                        try {
                            const stats = await fs_1.default.promises.stat(fullPath);
                            const fileId = await repository_1.fileRepository.upsertFile(scopeId, fullPath, {
                                size: stats.size,
                                ctime: stats.ctime,
                                mtime: stats.mtime
                            });
                            // Index content if allowed and < 5MB
                            const ext = path_1.default.extname(fullPath).toLowerCase();
                            if (allowedExtensions.includes(ext) && stats.size < 5 * 1024 * 1024) {
                                try {
                                    const content = await fs_1.default.promises.readFile(fullPath, 'utf8');
                                    await repository_1.searchRepository.indexContent(fileId, content);
                                }
                                catch (err) {
                                    // ignore content read errors
                                }
                            }
                            fileCount++;
                            if (fileCount % 100 === 0) {
                                console.log(`[CRAWLER] Scope ${scopeId}: Processed ${fileCount} files...`);
                            }
                        }
                        catch (err) {
                            // ignore individual file errors
                        }
                    }
                }
            }
            catch (err) {
                console.error(`[CRAWLER] Error scanning ${current.path}:`, err);
            }
            // Use setImmediate to let the event loop breathe (handle UI requests)
            setImmediate(processQueue);
        };
        processQueue();
    }
};
