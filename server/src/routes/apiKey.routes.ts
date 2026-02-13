import { Router } from 'express';
import { authenticateToken, authService, AuthRequest } from '../auth';
import { apiKeyRepository } from '../db/repository';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const keys = await apiKeyRepository.getAll(userId);
        res.json(keys);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { name, permissions, privacyProfileId } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        
        const key = authService.generateApiKey();
        const newKey = await apiKeyRepository.create(userId, name, key, permissions || 'files:read,tags:read', privacyProfileId);
        res.json(newKey);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { id } = req.params;
        await apiKeyRepository.delete(userId, Number(id));
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { id } = req.params;
        const { name, permissions, privacyProfileId } = req.body;
        await apiKeyRepository.update(userId, Number(id), { name, permissions, privacyProfileId });
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
