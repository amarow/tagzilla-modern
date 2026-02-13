"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_1 = require("../auth");
const crawler_1 = require("../services/crawler");
exports.AuthController = {
    async register(req, res) {
        try {
            const { username, password } = req.body;
            if (!username || !password)
                return res.status(400).json({ error: 'Missing credentials' });
            await auth_1.authService.register(username, password);
            res.json({ success: true });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    async login(req, res) {
        try {
            const { username, password } = req.body;
            const result = await auth_1.authService.login(username, password);
            if (!result)
                return res.status(401).json({ error: 'Invalid credentials' });
            crawler_1.crawlerService.initUser(result.user.id).catch(err => {
                console.error(`Failed to init crawler for user ${result.user.id}:`, err);
            });
            res.json(result);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    async changePassword(req, res) {
        try {
            const userId = req.user.id;
            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword)
                return res.status(400).json({ error: 'Missing password fields' });
            await auth_1.authService.changePassword(userId, currentPassword, newPassword);
            res.json({ success: true });
        }
        catch (e) {
            if (e.message === 'Invalid current password') {
                res.status(401).json({ error: e.message });
            }
            else {
                res.status(500).json({ error: e.message });
            }
        }
    }
};
