import { prisma } from './client';
import path from 'path';

export const scopeRepository = {
  async create(userId: number, directoryPath: string, name?: string) {
    return prisma.scope.create({
      data: {
        userId,
        path: directoryPath,
        name: name || path.basename(directoryPath),
      },
    });
  },

  async getAll(userId?: number) {
    if (userId) {
        return prisma.scope.findMany({ where: { userId } });
    }
    return prisma.scope.findMany();
  },
  
  async getById(id: number) {
      return prisma.scope.findUnique({ where: { id }});
  }
};

export const fileRepository = {
  async upsertFile(scopeId: number, filePath: string, stats: { size: number; ctime: Date; mtime: Date }) {
    const filename = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();
    
    // Simple naive mime mapping
    let mimeType = 'application/octet-stream';
    if (extension === '.txt') mimeType = 'text/plain';
    if (extension === '.pdf') mimeType = 'application/pdf';
    if (extension === '.jpg' || extension === '.jpeg') mimeType = 'image/jpeg';
    if (extension === '.png') mimeType = 'image/png';
    if (extension === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // Use native upsert which is safer and handles concurrency
    return prisma.fileHandle.upsert({
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

  async removeFile(scopeId: number, filePath: string) {
      // Find file by scope and path
      const file = await prisma.fileHandle.findUnique({
          where: { scopeId_path: { scopeId, path: filePath } }
      });
      if (file) {
          return prisma.fileHandle.delete({ where: { id: file.id } });
      }
  },
  
  // Get all files for a specific user (through user's scopes)
  async getAll(userId: number) {
      return prisma.fileHandle.findMany({ 
        where: {
            scope: { userId }
        },
        include: { tags: true },
        orderBy: { updatedAt: 'desc' }
      });
  },

  async addTagToFile(userId: number, fileId: number, tagName: string) {
    // 1. Ensure file belongs to user (security check, implied by logic but good to have)
    // 2. Find or create tag for THIS user
    const file = await prisma.fileHandle.findUnique({ where: { id: fileId }, include: { scope: true } });
    if (!file || file.scope.userId !== userId) throw new Error("File access denied");

    return prisma.fileHandle.update({
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

  async removeTagFromFile(userId: number, fileId: number, tagId: number) {
    const file = await prisma.fileHandle.findUnique({ where: { id: fileId }, include: { scope: true } });
    if (!file || file.scope.userId !== userId) throw new Error("File access denied");

    return prisma.fileHandle.update({
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

export const tagRepository = {
  async getAll(userId: number) {
    return prisma.tag.findMany({
      where: { userId },
      include: {
        _count: {
          select: { files: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  },

  async create(userId: number, name: string, color?: string) {
    return prisma.tag.create({
      data: { name, color, userId }
    });
  },

  async delete(userId: number, id: number) {
    // Ensure tag belongs to user
    const tag = await prisma.tag.findUnique({ where: { id } });
    if (!tag || tag.userId !== userId) throw new Error("Access denied");
    
    return prisma.tag.delete({ where: { id } });
  }
};

export const appStateRepository = {
  async get(userId: number) {
    const item = await prisma.appState.findUnique({ where: { userId } });
    return item ? JSON.parse(item.value) : null;
  },

  async set(userId: number, value: any) {
    const strValue = JSON.stringify(value);
    return prisma.appState.upsert({
      where: { userId },
      update: { value: strValue },
      create: { userId, value: strValue }
    });
  }
};
