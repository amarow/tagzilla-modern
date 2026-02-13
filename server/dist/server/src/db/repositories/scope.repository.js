"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scopeRepository = void 0;
const client_1 = require("../client");
const path_1 = __importDefault(require("path"));
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
