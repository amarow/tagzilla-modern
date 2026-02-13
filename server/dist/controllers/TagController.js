"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagController = void 0;
const repository_1 = require("../db/repository");
exports.TagController = {
    async getAll(req, res) {
        const userId = req.user.id;
        const tags = await repository_1.tagRepository.getAll(userId);
        res.json(tags);
    },
    async create(req, res) {
        try {
            const userId = req.user.id;
            const { name, color } = req.body;
            if (!name)
                return res.status(400).json({ error: 'Tag name is required' });
            const tag = await repository_1.tagRepository.create(userId, name, color);
            res.json(tag);
        }
        catch (e) {
            if (e.code === 'P2002' || e.message?.includes('UNIQUE')) {
                return res.status(409).json({ error: 'Tag already exists' });
            }
            res.status(500).json({ error: e.message });
        }
    },
    async update(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { name, color } = req.body;
            const updatedTag = await repository_1.tagRepository.update(userId, Number(id), { name, color });
            if (!updatedTag)
                return res.status(404).json({ error: 'Tag not found' });
            res.json(updatedTag);
        }
        catch (e) {
            if (e.code === 'P2002' || e.message?.includes('UNIQUE')) {
                return res.status(409).json({ error: 'Tag name already exists' });
            }
            res.status(500).json({ error: e.message });
        }
    },
    async delete(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            await repository_1.tagRepository.delete(userId, Number(id));
            res.json({ success: true });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
};
