"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appStateRepository = void 0;
const client_1 = require("../client");
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
