"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsController = void 0;
const repository_1 = require("../db/repository");
exports.SettingsController = {
    async getPreferences(req, res) {
        try {
            const userId = req.user.id;
            const prefs = await repository_1.appStateRepository.get(userId);
            res.json(prefs || {});
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    async setPreferences(req, res) {
        try {
            const userId = req.user.id;
            await repository_1.appStateRepository.set(userId, req.body);
            res.json({ success: true });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    async getSearchSettings(req, res) {
        try {
            const userId = req.user.id;
            const appState = await repository_1.appStateRepository.get(userId);
            const settings = appState?.search_settings || { allowedExtensions: null };
            res.json(settings);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    async updateSearchSettings(req, res) {
        try {
            const userId = req.user.id;
            const { allowedExtensions } = req.body;
            if (!Array.isArray(allowedExtensions))
                return res.status(400).json({ error: 'allowedExtensions must be an array' });
            let appState = await repository_1.appStateRepository.get(userId) || {};
            appState.search_settings = { allowedExtensions };
            await repository_1.appStateRepository.set(userId, appState);
            res.json({ success: true, settings: appState.search_settings });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
};
