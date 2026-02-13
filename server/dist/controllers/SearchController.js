"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchController = void 0;
const repository_1 = require("../db/repository");
exports.SearchController = {
    async search(req, res) {
        try {
            const userId = req.user.id;
            const { filename, content, directory } = req.query;
            if (!filename && !content && !directory)
                return res.json([]);
            const results = await repository_1.searchRepository.search(userId, { filename, content, directory });
            res.json(results);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
};
