"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScopeController = void 0;
const repository_1 = require("../db/repository");
const crawler_1 = require("../services/crawler");
const user_1 = require("../db/user");
exports.ScopeController = {
    async getAll(req, res) {
        const userId = req.user.id;
        const scopes = await repository_1.scopeRepository.getAll(userId);
        res.json(scopes);
    },
    async create(req, res) {
        try {
            const userId = req.user.id;
            const { path } = req.body;
            if (!path)
                return res.status(400).json({ error: 'Path is required' });
            const scope = await crawler_1.crawlerService.addScope(userId, path);
            res.json(scope);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    async refresh(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const scope = await repository_1.scopeRepository.getById(Number(id));
            if (!scope || scope.userId !== userId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            (0, user_1.ensureSystemTags)(userId);
            crawler_1.crawlerService.scanScope(scope.id, scope.path).then(async () => {
                await repository_1.fileRepository.applySystemTagsToAllFiles();
            }).catch(err => {
                console.error(`[API] Background scan failed for scope ${scope.id}:`, err);
            });
            res.json({ success: true, message: 'Scan started in background' });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    async delete(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            await repository_1.scopeRepository.delete(userId, Number(id));
            res.json({ success: true });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
};
