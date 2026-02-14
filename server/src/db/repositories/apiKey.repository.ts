import { db } from '../client';

export const apiKeyRepository = {
  async create(userId: number, name: string, key: string, permissions: string, privacyProfileIds?: number[]) {
    const info = db.transaction(() => {
      const stmt = db.prepare('INSERT INTO ApiKey (userId, name, key, permissions) VALUES (?, ?, ?, ?)');
      const keyInfo = stmt.run(userId, name, key, permissions);
      const apiKeyId = Number(keyInfo.lastInsertRowid);

      if (privacyProfileIds && privacyProfileIds.length > 0) {
        const profileStmt = db.prepare('INSERT INTO ApiKeyPrivacyProfile (apiKeyId, privacyProfileId, sequence) VALUES (?, ?, ?)');
        privacyProfileIds.forEach((profileId, index) => {
          profileStmt.run(apiKeyId, profileId, index);
        });
      }
      return apiKeyId;
    })();

    return { 
      id: info, 
      userId, 
      name, 
      key, 
      permissions: permissions.split(','), 
      privacyProfileIds: privacyProfileIds || [],
      createdAt: new Date() 
    };
  },

  async getAll(userId: number) {
    const stmt = db.prepare(`
      SELECT k.* 
      FROM ApiKey k 
      WHERE k.userId = ? 
      ORDER BY k.createdAt DESC
    `);
    const rows = stmt.all(userId) as any[];
    
    const profileStmt = db.prepare(`
      SELECT privacyProfileId 
      FROM ApiKeyPrivacyProfile 
      WHERE apiKeyId = ? 
      ORDER BY sequence ASC
    `);

    return rows.map(row => {
      const profiles = profileStmt.all(row.id) as { privacyProfileId: number }[];
      return {
        ...row,
        permissions: row.permissions ? row.permissions.split(',') : [],
        privacyProfileIds: profiles.map(p => p.privacyProfileId)
      };
    });
  },

  async delete(userId: number, id: number) {
    const stmt = db.prepare('DELETE FROM ApiKey WHERE id = ? AND userId = ?');
    const info = stmt.run(id, userId);
    return info.changes > 0;
  },

  async verify(key: string) {
    const stmt = db.prepare('SELECT * FROM ApiKey WHERE key = ?');
    const apiKey = stmt.get(key) as any;
    if (apiKey) {
      // Update lastUsedAt
      db.prepare('UPDATE ApiKey SET lastUsedAt = CURRENT_TIMESTAMP WHERE id = ?').run(apiKey.id);
      
      const profileStmt = db.prepare(`
        SELECT privacyProfileId 
        FROM ApiKeyPrivacyProfile 
        WHERE apiKeyId = ? 
        ORDER BY sequence ASC
      `);
      const profiles = profileStmt.all(apiKey.id) as { privacyProfileId: number }[];
      apiKey.privacyProfileIds = profiles.map(p => p.privacyProfileId);
      apiKey.permissions = apiKey.permissions ? apiKey.permissions.split(',') : [];
      
      return apiKey;
    }
    return null;
  },

  async update(userId: number, id: number, updates: { name?: string, permissions?: string, privacyProfileIds?: number[] }) {
    db.transaction(() => {
      const fields = [];
      const values = [];

      if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
      }
      if (updates.permissions !== undefined) {
        fields.push('permissions = ?');
        values.push(updates.permissions);
      }

      if (fields.length > 0) {
        values.push(id);
        values.push(userId);
        const stmt = db.prepare(`UPDATE ApiKey SET ${fields.join(', ')} WHERE id = ? AND userId = ?`);
        stmt.run(...values);
      }

      if (updates.privacyProfileIds !== undefined) {
        // Verify ownership indirectly by checking if key belongs to user
        const keyCheck = db.prepare('SELECT id FROM ApiKey WHERE id = ? AND userId = ?').get(id, userId);
        if (keyCheck) {
          db.prepare('DELETE FROM ApiKeyPrivacyProfile WHERE apiKeyId = ?').run(id);
          const profileStmt = db.prepare('INSERT INTO ApiKeyPrivacyProfile (apiKeyId, privacyProfileId, sequence) VALUES (?, ?, ?)');
          updates.privacyProfileIds.forEach((profileId, index) => {
            profileStmt.run(id, profileId, index);
          });
        }
      }
    })();
  }
};
