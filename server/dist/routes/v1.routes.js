"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../auth");
const repository_1 = require("../db/repository");
const privacy_1 = require("../services/privacy");
const client_1 = require("../db/client");
const fs = __importStar(require("fs/promises"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const mammoth_1 = __importDefault(require("mammoth"));
const router = (0, express_1.Router)();
// Middleware to allow either JWT or API Key
const authenticateAny = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const apiKeyHeader = req.headers['x-api-key'];
    if (apiKeyHeader || (authHeader && authHeader.startsWith('Bearer '))) {
        const token = authHeader && authHeader.split(' ')[1];
        if (token && token.split('.').length === 3) {
            return (0, auth_1.authenticateToken)(req, res, next);
        }
        return (0, auth_1.authenticateApiKey)(req, res, next);
    }
    return (0, auth_1.authenticateToken)(req, res, next);
};
router.get('/files', authenticateAny, async (req, res) => {
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
});
router.get('/tags', authenticateAny, async (req, res) => {
    try {
        const userId = req.user.id;
        const tags = await repository_1.tagRepository.getAll(userId);
        res.json(tags);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/search', authenticateAny, async (req, res) => {
    try {
        const userId = req.user.id;
        const { filename, content, directory } = req.query;
        const results = await repository_1.searchRepository.search(userId, { filename, content, directory });
        res.json(results);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/files/:id/text', authenticateAny, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const apiKey = req.apiKey;
        // 1. Check tag permissions if apiKey is used
        let allowedTagIds = undefined;
        if (apiKey) {
            allowedTagIds = apiKey.permissions
                .filter(p => p.startsWith('tag:'))
                .map(p => parseInt(p.split(':')[1]))
                .filter(id => !isNaN(id));
        }
        // 2. Fetch file and verify ownership/tags
        const sql = `
            SELECT f.path, f.extension 
            FROM FileHandle f 
            JOIN Scope s ON f.scopeId = s.id 
            WHERE f.id = ? AND s.userId = ?
        `;
        const file = client_1.db.prepare(sql).get(id, userId);
        if (!file) {
            res.status(404).json({ error: 'File not found or access denied' });
            return;
        }
        // 3. If restricted by tags, verify file has at least one of the allowed tags
        if (allowedTagIds && allowedTagIds.length > 0) {
            const tagCheck = client_1.db.prepare('SELECT 1 FROM _FileHandleToTag WHERE A = ? AND B IN (' + allowedTagIds.map(() => '?').join(',') + ')').get(id, ...allowedTagIds);
            if (!tagCheck) {
                res.status(403).json({ error: 'Access denied to this file due to tag restrictions' });
                return;
            }
        }
        // 4. Extract text
        const ext = file.extension.toLowerCase();
        let text = "";
        if (ext === '.docx') {
            const result = await mammoth_1.default.extractRawText({ path: file.path });
            text = result.value;
        }
        else if (ext === '.odt') {
            const zip = new adm_zip_1.default(file.path);
            const contentXml = zip.readAsText('content.xml');
            if (contentXml) {
                text = contentXml.replace(/<text:p[^>]*>/g, '\n\n')
                    .replace(/<[^>]+>/g, '').trim();
            }
        }
        else {
            text = await fs.readFile(file.path, 'utf8');
        }
        // 5. Apply Redaction if a profile is assigned to the API Key
        if (apiKey && apiKey.privacyProfileId) {
            text = await privacy_1.privacyService.redactText(text, apiKey.privacyProfileId);
        }
        res.setHeader('Content-Type', 'text/plain');
        res.send(text);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
exports.default = router;
