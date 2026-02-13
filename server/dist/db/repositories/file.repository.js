"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileRepository = void 0;
const client_1 = require("../client");
const path_1 = __importDefault(require("path"));
exports.fileRepository = {
    async upsertFile(scopeId, filePath, stats) {
        const runTransaction = client_1.db.transaction(() => {
            const filename = path_1.default.basename(filePath);
            const extension = path_1.default.extname(filePath).toLowerCase();
            // Simple naive mime mapping
            let mimeType = 'application/octet-stream';
            if (['.txt', '.md', '.rtf', '.csv', '.json', '.xml', '.log'].includes(extension))
                mimeType = 'text/plain';
            if (['.pdf'].includes(extension))
                mimeType = 'application/pdf';
            if (['.docx', '.doc'].includes(extension))
                mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            if (['.zip', '.7z', '.rar', '.tar', '.gz'].includes(extension))
                mimeType = 'application/zip'; // Treat all archives as zip/archive for now
            if (['.jpg', '.jpeg', '.png', '.avif', '.gif', '.webp', '.bmp', '.tiff', '.heic'].includes(extension))
                mimeType = 'image';
            if (['.avi', '.mp4', '.mkv', '.mov', '.webm', '.wmv', '.flv', '.m4v', '.3gp'].includes(extension))
                mimeType = 'video';
            if (['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'].includes(extension))
                mimeType = 'audio';
            // Using UPSERT syntax (INSERT OR REPLACE / ON CONFLICT)
            const sql = `
        INSERT INTO FileHandle (scopeId, path, name, extension, size, mimeType, updatedAt)
        VALUES (@scopeId, @path, @name, @extension, @size, @mimeType, @mtime)
        ON CONFLICT(scopeId, path) DO UPDATE SET
          size = excluded.size,
          updatedAt = excluded.updatedAt
        RETURNING id
      `;
            const stmt = client_1.db.prepare(sql);
            const row = stmt.get({
                scopeId,
                path: filePath,
                name: filename,
                extension,
                size: stats.size,
                mimeType,
                mtime: stats.mtime.toISOString()
            });
            const fileId = row.id;
            // Assign predefined tags
            const scope = client_1.db.prepare('SELECT userId FROM Scope WHERE id = ?').get(scopeId);
            if (scope) {
                const userId = scope.userId;
                let tagName = null;
                if (mimeType.startsWith('image'))
                    tagName = 'Bilder';
                else if (mimeType.startsWith('audio'))
                    tagName = 'Musik';
                else if (mimeType.startsWith('video'))
                    tagName = 'Video';
                else if (mimeType === 'application/zip')
                    tagName = 'Archive';
                else if (mimeType.startsWith('text') || mimeType === 'application/pdf' || mimeType.includes('document'))
                    tagName = 'Text';
                else
                    tagName = 'Rest'; // Default to Rest if no other tag matches
                if (tagName) {
                    const tag = client_1.db.prepare('SELECT id FROM Tag WHERE userId = ? AND name = ?').get(userId, tagName);
                    if (tag) {
                        client_1.db.prepare('INSERT OR IGNORE INTO _FileHandleToTag (A, B) VALUES (?, ?)').run(fileId, tag.id);
                    }
                }
            }
            return fileId;
        });
        return runTransaction();
    },
    async removeFile(scopeId, filePath) {
        const stmt = client_1.db.prepare('DELETE FROM FileHandle WHERE scopeId = ? AND path = ?');
        stmt.run(scopeId, filePath);
    },
    getFileMinimal(scopeId, filePath) {
        const stmt = client_1.db.prepare(`
        SELECT f.id, f.updatedAt, f.size, 
               EXISTS(SELECT 1 FROM FileContentIndex WHERE rowid = f.id) as hasContent
        FROM FileHandle f 
        WHERE f.scopeId = ? AND f.path = ?
      `);
        return stmt.get(scopeId, filePath);
    },
    // Get all files for a specific user (through user's scopes)
    async getAll(userId, allowedTagIds) {
        // Need a JOIN to check scope ownership
        let tagFilter = '';
        const params = [userId];
        if (allowedTagIds && allowedTagIds.length > 0) {
            const placeholders = allowedTagIds.map(() => '?').join(',');
            tagFilter = `AND f.id IN (SELECT A FROM _FileHandleToTag WHERE B IN (${placeholders}))`;
            params.push(...allowedTagIds);
        }
        const sql = `
        SELECT f.*, 
               json_group_array(json_object('id', t.id, 'name', t.name, 'color', t.color, 'isEditable', t.isEditable)) as tags_json
        FROM FileHandle f
        JOIN Scope s ON f.scopeId = s.id
        LEFT JOIN _FileHandleToTag ft ON f.id = ft.A
        LEFT JOIN Tag t ON ft.B = t.id
        WHERE s.userId = ? ${tagFilter}
        GROUP BY f.id
        ORDER BY f.updatedAt DESC
      `;
        const stmt = client_1.db.prepare(sql);
        const rows = stmt.all(...params);
        // Parse the JSON tags (sqlite returns string)
        return rows.map((row) => ({
            ...row,
            tags: JSON.parse(row.tags_json).filter((t) => t.id !== null)
        }));
    },
    async addTagToFile(userId, fileId, tagName) {
        // Transaction to ensure atomicity
        const runTransaction = client_1.db.transaction(() => {
            // 1. Verify access & Get Path
            const fileStmt = client_1.db.prepare(`
            SELECT f.path FROM FileHandle f 
            JOIN Scope s ON f.scopeId = s.id 
            WHERE f.id = ? AND s.userId = ?
        `);
            const file = fileStmt.get(fileId, userId);
            if (!file)
                throw new Error("File access denied");
            // 2. Find or Create Tag
            const upsertTag = client_1.db.prepare(`
            INSERT INTO Tag (userId, name) VALUES (?, ?)
            ON CONFLICT(userId, name) DO NOTHING
        `);
            upsertTag.run(userId, tagName);
            const getTag = client_1.db.prepare('SELECT id FROM Tag WHERE userId = ? AND name = ?');
            const tag = getTag.get(userId, tagName);
            // 3. Find ALL matching files (same path, same user)
            const allInstancesStmt = client_1.db.prepare(`
            SELECT f.id FROM FileHandle f
            JOIN Scope s ON f.scopeId = s.id
            WHERE f.path = ? AND s.userId = ?
        `);
            const instances = allInstancesStmt.all(file.path, userId);
            // 4. Link ALL instances to Tag
            const link = client_1.db.prepare(`
            INSERT OR IGNORE INTO _FileHandleToTag (A, B) VALUES (?, ?)
        `);
            for (const instance of instances) {
                link.run(instance.id, tag.id);
            }
            return this.getFileWithTags(fileId);
        });
        return runTransaction();
    },
    async addTagToFiles(userId, fileIds, tagName) {
        const runTransaction = client_1.db.transaction(() => {
            // 1. Find or Create Tag (once)
            const upsertTag = client_1.db.prepare(`
            INSERT INTO Tag (userId, name) VALUES (?, ?)
            ON CONFLICT(userId, name) DO NOTHING
        `);
            upsertTag.run(userId, tagName);
            const getTag = client_1.db.prepare('SELECT id, name, color FROM Tag WHERE userId = ? AND name = ?');
            const tag = getTag.get(userId, tagName);
            // 2. Process Files
            // Get all paths first
            const checkFile = client_1.db.prepare(`
            SELECT f.path FROM FileHandle f 
            JOIN Scope s ON f.scopeId = s.id 
            WHERE f.id = ? AND s.userId = ?
        `);
            // Query to find all instances for a path
            const allInstancesStmt = client_1.db.prepare(`
            SELECT f.id FROM FileHandle f
            JOIN Scope s ON f.scopeId = s.id
            WHERE f.path = ? AND s.userId = ?
        `);
            const link = client_1.db.prepare(`
            INSERT OR IGNORE INTO _FileHandleToTag (A, B) VALUES (?, ?)
        `);
            const updatedFiles = [];
            const processedPaths = new Set();
            for (const fileId of fileIds) {
                const file = checkFile.get(fileId, userId);
                if (file && !processedPaths.has(file.path)) {
                    processedPaths.add(file.path);
                    const instances = allInstancesStmt.all(file.path, userId);
                    for (const instance of instances) {
                        link.run(instance.id, tag.id);
                        updatedFiles.push(instance.id);
                    }
                }
            }
            return {
                tag,
                updatedFileIds: updatedFiles
            };
        });
        return runTransaction();
    },
    async removeTagFromFiles(userId, fileIds, tagId) {
        const runTransaction = client_1.db.transaction(() => {
            const checkFile = client_1.db.prepare(`
            SELECT f.path FROM FileHandle f 
            JOIN Scope s ON f.scopeId = s.id 
            WHERE f.id = ? AND s.userId = ?
        `);
            const allInstancesStmt = client_1.db.prepare(`
            SELECT f.id FROM FileHandle f
            JOIN Scope s ON f.scopeId = s.id
            WHERE f.path = ? AND s.userId = ?
        `);
            const unlinkOne = client_1.db.prepare('DELETE FROM _FileHandleToTag WHERE A = ? AND B = ?');
            const updatedFileIds = [];
            const processedPaths = new Set();
            for (const fileId of fileIds) {
                const file = checkFile.get(fileId, userId);
                if (file && !processedPaths.has(file.path)) {
                    processedPaths.add(file.path);
                    const instances = allInstancesStmt.all(file.path, userId);
                    for (const instance of instances) {
                        const info = unlinkOne.run(instance.id, tagId);
                        if (info.changes > 0) {
                            updatedFileIds.push(instance.id);
                        }
                    }
                }
            }
            return { tagId, updatedFileIds };
        });
        return runTransaction();
    },
    async removeTagFromFile(userId, fileId, tagId) {
        const runTransaction = client_1.db.transaction(() => {
            // 1. Verify access & Get Path
            const fileStmt = client_1.db.prepare(`
            SELECT f.path FROM FileHandle f 
            JOIN Scope s ON f.scopeId = s.id 
            WHERE f.id = ? AND s.userId = ?
        `);
            const file = fileStmt.get(fileId, userId);
            if (!file)
                throw new Error("File access denied");
            // 2. Find ALL matching files
            const allInstancesStmt = client_1.db.prepare(`
            SELECT f.id FROM FileHandle f
            JOIN Scope s ON f.scopeId = s.id
            WHERE f.path = ? AND s.userId = ?
        `);
            const instances = allInstancesStmt.all(file.path, userId);
            // 3. Unlink ALL instances
            const unlink = client_1.db.prepare('DELETE FROM _FileHandleToTag WHERE A = ? AND B = ?');
            for (const instance of instances) {
                unlink.run(instance.id, tagId);
            }
            return this.getFileWithTags(fileId);
        });
        return runTransaction();
    },
    async pruneFiles(scopeId, validFileIds) {
        // 1. Get all file IDs for this scope
        const allFilesStmt = client_1.db.prepare('SELECT id FROM FileHandle WHERE scopeId = ?');
        const allFiles = allFilesStmt.all(scopeId);
        const validSet = new Set(validFileIds);
        const toDelete = allFiles.filter(f => !validSet.has(f.id)).map(f => f.id);
        if (toDelete.length === 0)
            return 0;
        const deleteStmt = client_1.db.prepare('DELETE FROM FileHandle WHERE id = ?');
        const deleteTagsStmt = client_1.db.prepare('DELETE FROM _FileHandleToTag WHERE A = ?');
        const deleteContentStmt = client_1.db.prepare('DELETE FROM FileContentIndex WHERE rowid = ?');
        const runTransaction = client_1.db.transaction(() => {
            for (const id of toDelete) {
                deleteTagsStmt.run(id); // Clean up tags
                deleteContentStmt.run(id); // Clean up FTS index
                deleteStmt.run(id);
            }
            return toDelete.length;
        });
        return runTransaction();
    },
    // Helper
    getFileWithTags(fileId) {
        const sql = `
        SELECT f.*, 
               json_group_array(json_object('id', t.id, 'name', t.name, 'color', t.color, 'isEditable', t.isEditable)) as tags_json
        FROM FileHandle f
        LEFT JOIN _FileHandleToTag ft ON f.id = ft.A
        LEFT JOIN Tag t ON ft.B = t.id
        WHERE f.id = ?
        GROUP BY f.id
      `;
        const row = client_1.db.prepare(sql).get(fileId);
        if (!row)
            return null;
        return {
            ...row,
            tags: JSON.parse(row.tags_json).filter((t) => t.id !== null)
        };
    },
    async applySystemTagsToAllFiles() {
        console.log('Running system tag update on all files...');
        const runTransaction = client_1.db.transaction(() => {
            let totalChanges = 0;
            // Define mappings
            const mappings = [
                { tagName: 'Text', exts: ['.txt', '.md', '.rtf', '.csv', '.json', '.xml', '.log', '.pdf', '.docx', '.doc', '.odt'] },
                { tagName: 'Bilder', exts: ['.jpg', '.jpeg', '.png', '.avif', '.gif', '.webp', '.bmp', '.tiff', '.heic'] },
                { tagName: 'Video', exts: ['.avi', '.mp4', '.mkv', '.mov', '.webm', '.wmv', '.flv', '.m4v', '.3gp'] },
                { tagName: 'Musik', exts: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'] },
                { tagName: 'Archive', exts: ['.zip', '.7z', '.rar', '.tar', '.gz'] }
            ];
            for (const map of mappings) {
                // 1. Get all file extensions as a quoted list for SQL
                const placeholders = map.exts.map(() => '?').join(',');
                // 2. Insert links
                // We join FileHandle -> Scope -> Tag (by userId and Name)
                const sql = `
                  INSERT OR IGNORE INTO _FileHandleToTag (A, B)
                  SELECT f.id, t.id
                  FROM FileHandle f
                  JOIN Scope s ON f.scopeId = s.id
                  JOIN Tag t ON s.userId = t.userId
                  WHERE t.name = ?
                  AND f.extension IN (${placeholders})
              `;
                const stmt = client_1.db.prepare(sql);
                const info = stmt.run(map.tagName, ...map.exts);
                totalChanges += info.changes;
            }
            // 3. Apply 'Rest' tag to files that have NO tags (or effectively, files that didn't match above categories)
            const systemTagNames = ['Bilder', 'Musik', 'Text', 'Video', 'Archive'];
            const placeholders = systemTagNames.map(() => '?').join(',');
            const sqlRest = `
              INSERT OR IGNORE INTO _FileHandleToTag (A, B)
              SELECT f.id, tRest.id
              FROM FileHandle f
              JOIN Scope s ON f.scopeId = s.id
              JOIN Tag tRest ON s.userId = tRest.userId AND tRest.name = 'Rest'
              WHERE NOT EXISTS (
                  SELECT 1 
                  FROM _FileHandleToTag ft
                  JOIN Tag t ON ft.B = t.id
                  WHERE ft.A = f.id
                  AND t.name IN (${placeholders})
              )
          `;
            const stmtRest = client_1.db.prepare(sqlRest);
            const infoRest = stmtRest.run(...systemTagNames);
            totalChanges += infoRest.changes;
            return totalChanges;
        });
        const changes = runTransaction();
        console.log(`System tags applied (including 'Rest'). New links created: ${changes}`);
    }
};
