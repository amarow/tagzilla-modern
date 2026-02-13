import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth';
import { searchRepository } from '../db/repository';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { filename, content, directory } = req.query as { filename?: string, content?: string, directory?: string };
        
        if (!filename && !content && !directory) {
            res.json([]); 
            return;
        }
        
        const results = await searchRepository.search(userId, { filename, content, directory });
        res.json(results);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
