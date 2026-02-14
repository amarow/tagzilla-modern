import { db } from '../client';

export const privacyRepository = {
  async createProfile(userId: number, name: string) {
    const stmt = db.prepare('INSERT INTO PrivacyProfile (userId, name) VALUES (?, ?)');
    const info = stmt.run(userId, name);
    return { id: Number(info.lastInsertRowid), userId, name };
  },

  async getProfiles(userId: number) {
    const stmt = db.prepare(`
      SELECT p.*, COUNT(r.id) as ruleCount 
      FROM PrivacyProfile p 
      LEFT JOIN PrivacyRule r ON p.id = r.profileId 
      WHERE p.userId = ? 
      GROUP BY p.id
    `);
    return stmt.all(userId);
  },

  async deleteProfile(userId: number, id: number) {
    const stmt = db.prepare('DELETE FROM PrivacyProfile WHERE id = ? AND userId = ?');
    const info = stmt.run(id, userId);
    return info.changes > 0;
  },

  async addRule(profileId: number, rule: { type: string, pattern: string, replacement: string }) {
    const stmt = db.prepare('INSERT INTO PrivacyRule (profileId, type, pattern, replacement) VALUES (?, ?, ?, ?)');
    const info = stmt.run(profileId, rule.type, rule.pattern, rule.replacement);
    return { id: Number(info.lastInsertRowid), profileId, ...rule, isActive: 1 };
  },

  async getRules(profileId: number) {
    const stmt = db.prepare('SELECT * FROM PrivacyRule WHERE profileId = ?');
    return stmt.all(profileId);
  },

  async deleteRule(id: number) {
    const stmt = db.prepare('DELETE FROM PrivacyRule WHERE id = ?');
    stmt.run(id);
  },

  async toggleRule(id: number, isActive: boolean) {
    const stmt = db.prepare('UPDATE PrivacyRule SET isActive = ? WHERE id = ?');
    stmt.run(isActive ? 1 : 0, id);
  },

  async updateRule(id: number, rule: { type?: string, pattern?: string, replacement?: string, isActive?: boolean }) {
    const fields: string[] = [];
    const values: any[] = [];

    if (rule.type !== undefined) { fields.push('type = ?'); values.push(rule.type); }
    if (rule.pattern !== undefined) { fields.push('pattern = ?'); values.push(rule.pattern); }
    if (rule.replacement !== undefined) { fields.push('replacement = ?'); values.push(rule.replacement); }
    if (rule.isActive !== undefined) { fields.push('isActive = ?'); values.push(rule.isActive ? 1 : 0); }

    if (fields.length === 0) return;

    const stmt = db.prepare(`UPDATE PrivacyRule SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values, id);
  }
};
