"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.privacyRepository = void 0;
const client_1 = require("../client");
exports.privacyRepository = {
    async createProfile(userId, name) {
        const stmt = client_1.db.prepare('INSERT INTO PrivacyProfile (userId, name) VALUES (?, ?)');
        const info = stmt.run(userId, name);
        return { id: Number(info.lastInsertRowid), userId, name };
    },
    async getProfiles(userId) {
        const stmt = client_1.db.prepare(`
      SELECT p.*, COUNT(r.id) as ruleCount 
      FROM PrivacyProfile p 
      LEFT JOIN PrivacyRule r ON p.id = r.profileId 
      WHERE p.userId = ? 
      GROUP BY p.id
    `);
        return stmt.all(userId);
    },
    async deleteProfile(userId, id) {
        const stmt = client_1.db.prepare('DELETE FROM PrivacyProfile WHERE id = ? AND userId = ?');
        const info = stmt.run(id, userId);
        return info.changes > 0;
    },
    async addRule(profileId, rule) {
        const stmt = client_1.db.prepare('INSERT INTO PrivacyRule (profileId, type, pattern, replacement) VALUES (?, ?, ?, ?)');
        const info = stmt.run(profileId, rule.type, rule.pattern, rule.replacement);
        return { id: Number(info.lastInsertRowid), profileId, ...rule, isActive: 1 };
    },
    async getRules(profileId) {
        const stmt = client_1.db.prepare('SELECT * FROM PrivacyRule WHERE profileId = ?');
        return stmt.all(profileId);
    },
    async deleteRule(id) {
        const stmt = client_1.db.prepare('DELETE FROM PrivacyRule WHERE id = ?');
        stmt.run(id);
    },
    async toggleRule(id, isActive) {
        const stmt = client_1.db.prepare('UPDATE PrivacyRule SET isActive = ? WHERE id = ?');
        stmt.run(isActive ? 1 : 0, id);
    },
    async updateRule(id, rule) {
        const fields = [];
        const values = [];
        if (rule.type !== undefined) {
            fields.push('type = ?');
            values.push(rule.type);
        }
        if (rule.pattern !== undefined) {
            fields.push('pattern = ?');
            values.push(rule.pattern);
        }
        if (rule.replacement !== undefined) {
            fields.push('replacement = ?');
            values.push(rule.replacement);
        }
        if (rule.isActive !== undefined) {
            fields.push('isActive = ?');
            values.push(rule.isActive ? 1 : 0);
        }
        if (fields.length === 0)
            return;
        const stmt = client_1.db.prepare(`UPDATE PrivacyRule SET ${fields.join(', ')} WHERE id = ?`);
        stmt.run(...values, id);
    }
};
