import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth';
import { appStateRepository } from '../db/repository';

const router = Router();

router.get('/preferences', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const prefs = await appStateRepository.get(userId);
        res.json(prefs || {});
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/preferences', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        await appStateRepository.set(userId, req.body);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/search', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const appState = await appStateRepository.get(userId);
        const settings = appState?.search_settings || { allowedExtensions: null }; 
        res.json(settings);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/search', authenticateToken, async (req, res) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const { allowedExtensions } = req.body;
        
        if (!Array.isArray(allowedExtensions)) return res.status(400).json({ error: 'allowedExtensions must be an array' });

        let appState = await appStateRepository.get(userId) || {};
        appState.search_settings = { allowedExtensions };
        
        await appStateRepository.set(userId, appState);
        res.json({ success: true, settings: appState.search_settings });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
