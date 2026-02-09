"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRepository = exports.appStateRepository = exports.tagRepository = exports.fileRepository = exports.scopeRepository = void 0;
const client_1 = require("./client");
const path_1 = __importDefault(require("path"));
// --- Statements ---
// We prepare statements once for efficiency where possible
exports.scopeRepository = {
    async create(userId, directoryPath, name) {
        const scopeName = name || path_1.default.basename(directoryPath);
        const stmt = client_1.db.prepare('INSERT INTO Scope (userId, path, name) VALUES (?, ?, ?)');
        const info = stmt.run(userId, directoryPath, scopeName);
        return { id: Number(info.lastInsertRowid), userId, path: directoryPath, name: scopeName, createdAt: new Date() };
    },
    async getAll(userId) {
        if (userId) {
            const stmt = client_1.db.prepare('SELECT * FROM Scope WHERE userId = ?');
            return stmt.all(userId);
        }
        const stmt = client_1.db.prepare('SELECT * FROM Scope');
        return stmt.all();
    },
    async getById(id) {
        const stmt = client_1.db.prepare('SELECT * FROM Scope WHERE id = ?');
        return stmt.get(id);
    },
    async delete(userId, id) {
        const stmt = client_1.db.prepare('DELETE FROM Scope WHERE id = ? AND userId = ?');
        stmt.run(id, userId);
    }
};
exports.fileRepository = {
    async upsertFile(scopeId, filePath, stats) {
        const filename = path_1.default.basename(filePath);
        const extension = path_1.default.extname(filePath).toLowerCase();
        // Simple naive mime mapping
        let mimeType = 'application/octet-stream';
        if (extension === '.txt')
            mimeType = 'text/plain';
        if (extension === '.pdf')
            mimeType = 'application/pdf';
        if (extension === '.jpg' || extension === '.jpeg')
            mimeType = 'image/jpeg';
        if (extension === '.png')
            mimeType = 'image/png';
        if (extension === '.avif')
            mimeType = 'image/avif';
        if (extension === '.docx')
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (extension === '.avi')
            mimeType = 'video/x-msvideo';
        if (extension === '.mp4')
            mimeType = 'video/mp4';
        if (extension === '.mkv')
            mimeType = 'video/x-matroska';
        if (extension === '.mov')
            mimeType = 'video/quicktime';
        // Using UPSERT syntax (INSERT OR REPLACE / ON CONFLICT)
        // SQLite supports ON CONFLICT(scopeId, path) DO UPDATE
        // Use mtime (modification time) from file stats for updatedAt
        // We use RETURNING id to get the correct ID even if no update happens or cached
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
        return row.id;
    },
    async removeFile(scopeId, filePath) {
        const stmt = client_1.db.prepare('DELETE FROM FileHandle WHERE scopeId = ? AND path = ?');
        stmt.run(scopeId, filePath);
    },
    getFileMinimal(scopeId, filePath) {
        const stmt = client_1.db.prepare('SELECT id, updatedAt, size FROM FileHandle WHERE scopeId = ? AND path = ?');
        return stmt.get(scopeId, filePath);
    },
    // Get all files for a specific user (through user's scopes)
    async getAll(userId) {
        // Need a JOIN to check scope ownership
        const sql = `
        SELECT f.*, 
               json_group_array(json_object('id', t.id, 'name', t.name, 'color', t.color)) as tags_json
        FROM FileHandle f
        JOIN Scope s ON f.scopeId = s.id
        LEFT JOIN _FileHandleToTag ft ON f.id = ft.A
        LEFT JOIN Tag t ON ft.B = t.id
        WHERE s.userId = ?
        GROUP BY f.id
        ORDER BY f.updatedAt DESC
      `;
        const stmt = client_1.db.prepare(sql);
        const rows = stmt.all(userId);
        // Parse the JSON tags (sqlite returns string)
        return rows.map((row) => ({
            ...row,
            tags: JSON.parse(row.tags_json).filter((t) => t.id !== null)
        }));
    },
    async addTagToFile(userId, fileId, tagName) {
        // Transaction to ensure atomicity
        const runTransaction = client_1.db.transaction(() => {
            // 1. Verify access
            const fileStmt = client_1.db.prepare(`
            SELECT f.id FROM FileHandle f 
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
            // 3. Link File to Tag
            const link = client_1.db.prepare(`
            INSERT OR IGNORE INTO _FileHandleToTag (A, B) VALUES (?, ?)
        `);
            link.run(fileId, tag.id);
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
            const getTag = client_1.db.prepare('SELECT id FROM Tag WHERE userId = ? AND name = ?');
            const tag = getTag.get(userId, tagName);
            // 2. Process Files
            const checkFile = client_1.db.prepare(`
            SELECT f.id FROM FileHandle f 
            JOIN Scope s ON f.scopeId = s.id 
            WHERE f.id = ? AND s.userId = ?
        `);
            const link = client_1.db.prepare(`
            INSERT OR IGNORE INTO _FileHandleToTag (A, B) VALUES (?, ?)
        `);
            const updatedFiles = [];
            for (const fileId of fileIds) {
                const file = checkFile.get(fileId, userId);
                if (file) {
                    link.run(fileId, tag.id);
                    // We don't return full objects to save bandwidth on massive updates,
                    // but returning IDs allows client to update locally.
                    updatedFiles.push(fileId);
                }
            }
            return {
                tag,
                updatedFileIds: updatedFiles
            };
        });
        return runTransaction();
    },
    async removeTagFromFile(userId, fileId, tagId) {
        const runTransaction = client_1.db.transaction(() => {
            // 1. Verify access
            const fileStmt = client_1.db.prepare(`
            SELECT f.id FROM FileHandle f 
            JOIN Scope s ON f.scopeId = s.id 
            WHERE f.id = ? AND s.userId = ?
        `);
            const file = fileStmt.get(fileId, userId);
            if (!file)
                throw new Error("File access denied");
            // 2. Unlink
            const unlink = client_1.db.prepare('DELETE FROM _FileHandleToTag WHERE A = ? AND B = ?');
            unlink.run(fileId, tagId);
            return this.getFileWithTags(fileId);
        });
        return runTransaction();
    },
    // Helper
    getFileWithTags(fileId) {
        const sql = `
        SELECT f.*, 
               json_group_array(json_object('id', t.id, 'name', t.name, 'color', t.color)) as tags_json
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
    }
};
exports.tagRepository = {
    async getAll(userId) {
        // Count files linked
        const sql = `
        SELECT t.*, COUNT(ft.A) as fileCount
        FROM Tag t
        LEFT JOIN _FileHandleToTag ft ON t.id = ft.B
        WHERE t.userId = ?
        GROUP BY t.id
        ORDER BY t.name ASC
    `;
        const stmt = client_1.db.prepare(sql);
        const rows = stmt.all(userId);
        // Map to structure compatible with frontend expectation { ..., _count: { files: N } }
        return rows.map((r) => ({
            id: r.id,
            name: r.name,
            color: r.color,
            userId: r.userId,
            _count: { files: r.fileCount }
        }));
    },
    async create(userId, name, color) {
        const stmt = client_1.db.prepare('INSERT INTO Tag (userId, name, color) VALUES (?, ?, ?)');
        const info = stmt.run(userId, name, color);
        return { id: Number(info.lastInsertRowid), userId, name, color };
    },
    async update(userId, id, updates) {
        const { name, color } = updates;
        const fields = [];
        const values = [];
        if (name !== undefined) {
            fields.push('name = ?');
            values.push(name);
        }
        if (color !== undefined) {
            fields.push('color = ?');
            values.push(color);
        }
        if (fields.length === 0)
            return null;
        values.push(id);
        values.push(userId);
        const stmt = client_1.db.prepare(`UPDATE Tag SET ${fields.join(', ')} WHERE id = ? AND userId = ?`);
        stmt.run(...values);
        // Return updated tag
        const getStmt = client_1.db.prepare('SELECT * FROM Tag WHERE id = ?');
        return getStmt.get(id);
    },
    async delete(userId, id) {
        const stmt = client_1.db.prepare('DELETE FROM Tag WHERE id = ? AND userId = ?');
        stmt.run(id, userId);
    }
};
exports.appStateRepository = {
    async get(userId) {
        const stmt = client_1.db.prepare('SELECT value FROM AppState WHERE userId = ?');
        const row = stmt.get(userId);
        return row ? JSON.parse(row.value) : null;
    },
    async set(userId, value) {
        const strValue = JSON.stringify(value);
        const sql = `
        INSERT INTO AppState (userId, value) VALUES (?, ?)
        ON CONFLICT(userId) DO UPDATE SET value = excluded.value
    `;
        client_1.db.prepare(sql).run(userId, strValue);
    }
};
exports.searchRepository = {
    async indexContent(fileId, content) {
        const stmt = client_1.db.prepare('INSERT OR REPLACE INTO FileContentIndex(rowid, content) VALUES (?, ?)');
        stmt.run(fileId, content);
    },
    async search(userId, query, mode = 'filename') {
        let rows;
        if (mode === 'content') {
            const terms = query.trim().split(/\s+/).filter(t => t.length > 0);
            if (terms.length === 0)
                return [];
            // Construct FTS query: "term1"* AND "term2"*
            const ftsQuery = terms.map(t => `"${t.replace(/"/g, '""')}"*`).join(' AND ');
            const sql = `
        SELECT f.*,
               snippet(FileContentIndex, 0, '<b>', '</b>', '...', 64) as snippet,
               (
                   SELECT json_group_array(json_object('id', t.id, 'name', t.name, 'color', t.color))
                   FROM _FileHandleToTag ft
                   JOIN Tag t ON ft.B = t.id
                   WHERE ft.A = f.id
               ) as tags_json
        FROM FileContentIndex fts
        JOIN FileHandle f ON f.id = fts.rowid
        JOIN Scope s ON f.scopeId = s.id
        WHERE s.userId = ? AND fts.content MATCH ?
        ORDER BY rank
        LIMIT 50
      `;
            rows = client_1.db.prepare(sql).all(userId, ftsQuery);
        }
        else {
            const sql = `
        SELECT f.*,
               (
                   SELECT json_group_array(json_object('id', t.id, 'name', t.name, 'color', t.color))
                   FROM _FileHandleToTag ft
                   JOIN Tag t ON ft.B = t.id
                   WHERE ft.A = f.id
               ) as tags_json
        FROM FileHandle f
        JOIN Scope s ON f.scopeId = s.id
        WHERE s.userId = ? AND f.name LIKE ?
        ORDER BY f.updatedAt DESC
        LIMIT 50
      `;
            rows = client_1.db.prepare(sql).all(userId, `%${query}%`);
        }
        return rows.map((row) => ({
            ...row,
            tags: row.tags_json ? JSON.parse(row.tags_json).filter((t) => t.id !== null) : []
        }));
    }
};
