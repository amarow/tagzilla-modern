"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appStateRepository = exports.tagRepository = exports.fileRepository = exports.scopeRepository = void 0;
const client_1 = require("./client");
const path_1 = __importDefault(require("path"));
exports.scopeRepository = {
    async create(userId, directoryPath, name) {
        return client_1.prisma.scope.create({
            data: {
                userId,
                path: directoryPath,
                name: name || path_1.default.basename(directoryPath),
            },
        });
    },
    async getAll(userId) {
        if (userId) {
            return client_1.prisma.scope.findMany({ where: { userId } });
        }
        return client_1.prisma.scope.findMany();
    },
    async getById(id) {
        return client_1.prisma.scope.findUnique({ where: { id } });
    }
};
exports.fileRepository = {
    async upsertFile(scopeId, filePath, stats) {
        const filename = path_1.default.basename(filePath);
        const extension = path_1.default.extname(filePath).toLowerCase();
        // Simple naive mime mapping
        let mimeType = 'application/octet-stream';
        if (extension === '.txt')
            mimeType = 'text/plain';
        if (extension === '.pdf')
            mimeType = 'application/pdf';
        if (extension === '.jpg' || extension === '.jpeg')
            mimeType = 'image/jpeg';
        if (extension === '.png')
            mimeType = 'image/png';
        if (extension === '.docx')
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        // Use native upsert which is safer and handles concurrency
        return client_1.prisma.fileHandle.upsert({
            where: { scopeId_path: { scopeId, path: filePath } },
            update: {
                size: stats.size,
                updatedAt: new Date(),
            },
            create: {
                path: filePath,
                name: filename,
                extension,
                size: stats.size,
                mimeType,
                scopeId,
            }
        });
    },
    async removeFile(scopeId, filePath) {
        // Find file by scope and path
        const file = await client_1.prisma.fileHandle.findUnique({
            where: { scopeId_path: { scopeId, path: filePath } }
        });
        if (file) {
            return client_1.prisma.fileHandle.delete({ where: { id: file.id } });
        }
    },
    // Get all files for a specific user (through user's scopes)
    async getAll(userId) {
        return client_1.prisma.fileHandle.findMany({
            where: {
                scope: { userId }
            },
            include: { tags: true },
            orderBy: { updatedAt: 'desc' }
        });
    },
    async addTagToFile(userId, fileId, tagName) {
        // 1. Ensure file belongs to user (security check, implied by logic but good to have)
        // 2. Find or create tag for THIS user
        const file = await client_1.prisma.fileHandle.findUnique({ where: { id: fileId }, include: { scope: true } });
        if (!file || file.scope.userId !== userId)
            throw new Error("File access denied");
        return client_1.prisma.fileHandle.update({
            where: { id: fileId },
            data: {
                tags: {
                    connectOrCreate: {
                        where: { userId_name: { userId, name: tagName } },
                        create: { name: tagName, userId }
                    }
                }
            },
            include: { tags: true }
        });
    },
    async removeTagFromFile(userId, fileId, tagId) {
        const file = await client_1.prisma.fileHandle.findUnique({ where: { id: fileId }, include: { scope: true } });
        if (!file || file.scope.userId !== userId)
            throw new Error("File access denied");
        return client_1.prisma.fileHandle.update({
            where: { id: fileId },
            data: {
                tags: {
                    disconnect: { id: tagId }
                }
            },
            include: { tags: true }
        });
    }
};
exports.tagRepository = {
    async getAll(userId) {
        return client_1.prisma.tag.findMany({
            where: { userId },
            include: {
                _count: {
                    select: { files: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    },
    async create(userId, name, color) {
        return client_1.prisma.tag.create({
            data: { name, color, userId }
        });
    },
    async delete(userId, id) {
        // Ensure tag belongs to user
        const tag = await client_1.prisma.tag.findUnique({ where: { id } });
        if (!tag || tag.userId !== userId)
            throw new Error("Access denied");
        return client_1.prisma.tag.delete({ where: { id } });
    }
};
exports.appStateRepository = {
    async get(userId) {
        const item = await client_1.prisma.appState.findUnique({ where: { userId } });
        return item ? JSON.parse(item.value) : null;
    },
    async set(userId, value) {
        const strValue = JSON.stringify(value);
        return client_1.prisma.appState.upsert({
            where: { userId },
            update: { value: strValue },
            create: { userId, value: strValue }
        });
    }
};
