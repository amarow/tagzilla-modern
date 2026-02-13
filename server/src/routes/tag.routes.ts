import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth';
import { tagRepository } from '../db/repository';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
    const userId = (req as AuthRequest).user!.id;
    const tags = await tagRepository.getAll(userId);
    res.json(tags);
});

router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { name, color } = req.body;
        if (!name) return res.status(400).json({ error: 'Tag name is required' });
        const tag = await tagRepository.create(userId, name, color);
        res.json(tag);
    } catch (e: any) {
        if (e.code === 'P2002' || e.message?.includes('UNIQUE')) {
             res.status(409).json({ error: 'Tag already exists' });
             return;
        }
        res.status(500).json({ error: e.message });
    }
});

router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { id } = req.params;
        const { name, color } = req.body;
        
        const updatedTag = await tagRepository.update(userId, Number(id), { name, color });
        if (!updatedTag) return res.status(404).json({ error: 'Tag not found' });
        res.json(updatedTag);
    } catch (e: any) {
        if (e.code === 'P2002' || e.message?.includes('UNIQUE')) {
             res.status(409).json({ error: 'Tag name already exists' });
             return;
        }
        res.status(500).json({ error: e.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { id } = req.params;
        await tagRepository.delete(userId, Number(id));
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
