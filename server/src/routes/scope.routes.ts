import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth';
import { scopeRepository, fileRepository } from '../db/repository';
import { crawlerService } from '../services/crawler';
import { ensureSystemTags } from '../db/user';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
    const userId = (req as AuthRequest).user!.id;
    const scopes = await scopeRepository.getAll(userId);
    res.json(scopes);
});

router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { path } = req.body;
        if (!path) {
             res.status(400).json({ error: 'Path is required' });
             return;
        }
        const scope = await crawlerService.addScope(userId, path);
        res.json(scope);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/:id/refresh', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { id } = req.params;
        console.log(`[API] Refresh requested for scope ${id} by user ${userId}`);
        const scope = await scopeRepository.getById(Number(id)) as any;
        if (!scope || scope.userId !== userId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        // 1. Ensure system tags exist for this user (just in case)
        ensureSystemTags(userId);
        
        // 2. Trigger background scan (Fire and Forget)
        console.log(`[API] Triggering background scan for scope ${id}`);
        crawlerService.scanScope(scope.id, scope.path).then(async () => {
             // 3. After scan (or during), ensure files are tagged correctly
             await fileRepository.applySystemTagsToAllFiles();
        }).catch(err => {
            console.error(`[API] Background scan failed for scope ${scope.id}:`, err);
        });
        
        res.json({ success: true, message: 'Scan started in background' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { id } = req.params;
        await scopeRepository.delete(userId, Number(id));
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
