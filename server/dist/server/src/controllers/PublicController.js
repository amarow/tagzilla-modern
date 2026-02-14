"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicController = void 0;
const repository_1 = require("../db/repository");
const privacy_1 = require("../services/privacy");
const file_service_1 = require("../services/file.service");
const client_1 = require("../db/client");
exports.PublicController = {
    async getFiles(req, res) {
        try {
            const userId = req.user.id;
            const apiKey = req.apiKey;
            let allowedTagIds = undefined;
            if (apiKey) {
                allowedTagIds = apiKey.permissions
                    .filter(p => p.startsWith('tag:'))
                    .map(p => parseInt(p.split(':')[1]))
                    .filter(id => !isNaN(id));
            }
            const files = await repository_1.fileRepository.getAll(userId, allowedTagIds);
            res.json(files);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    async getTags(req, res) {
        try {
            const userId = req.user.id;
            const tags = await repository_1.tagRepository.getAll(userId);
            res.json(tags);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    async search(req, res) {
        try {
            const userId = req.user.id;
            const apiKey = req.apiKey;
            const { filename, content, directory } = req.query;
            let results = await repository_1.searchRepository.search(userId, { filename, content, directory });
            if (apiKey && apiKey.privacyProfileIds && apiKey.privacyProfileIds.length > 0) {
                results = await Promise.all(results.map(async (f) => {
                    if (f.snippet) {
                        f.snippet = await privacy_1.privacyService.redactWithMultipleProfiles(f.snippet, apiKey.privacyProfileIds);
                    }
                    return f;
                }));
            }
            res.json(results);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    async getFileText(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const apiKey = req.apiKey;
            const { profileId } = req.query;
            let allowedTagIds = undefined;
            if (apiKey) {
                allowedTagIds = apiKey.permissions
                    .filter(p => p.startsWith('tag:'))
                    .map(p => parseInt(p.split(':')[1]))
                    .filter(id => !isNaN(id));
            }
            const sql = `SELECT f.path, f.extension FROM FileHandle f JOIN Scope s ON f.scopeId = s.id WHERE f.id = ? AND s.userId = ?`;
            const file = client_1.db.prepare(sql).get(id, userId);
            if (!file)
                return res.status(404).json({ error: 'File not found' });
            if (allowedTagIds && allowedTagIds.length > 0) {
                const tagCheck = client_1.db.prepare('SELECT 1 FROM _FileHandleToTag WHERE A = ? AND B IN (' + allowedTagIds.map(() => '?').join(',') + ')').get(id, ...allowedTagIds);
                if (!tagCheck)
                    return res.status(403).json({ error: 'Access denied' });
            }
            let text = await file_service_1.fileService.extractText(file.path, file.extension);
            // Use profiles from API Key or manual override (for preview)
            let profileIdsToApply = [];
            if (apiKey && apiKey.privacyProfileIds && apiKey.privacyProfileIds.length > 0) {
                profileIdsToApply = apiKey.privacyProfileIds;
            }
            else if (profileId) {
                profileIdsToApply = Array.isArray(profileId)
                    ? profileId.map(pid => Number(pid))
                    : [Number(profileId)];
            }
            if (profileIdsToApply.length > 0) {
                text = await privacy_1.privacyService.redactWithMultipleProfiles(text, profileIdsToApply);
            }
            res.setHeader('Content-Type', 'text/plain');
            res.send(text);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
};
