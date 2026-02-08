import { crawlerService } from '../src/services/crawler';
import { db } from '../src/db/client';

console.log('Starting manual crawler run...');

(async () => {
    try {
        await crawlerService.init();
        
        // Keep the script alive to let the crawler work
        setInterval(() => {
            const indexCount = db.prepare('SELECT COUNT(*) as count FROM FileContentIndex').get() as { count: number };
            console.log(`Indexed files: ${indexCount.count}`);
            
            if (indexCount.count > 100) {
                console.log('Indexed over 100 files, stopping script.');
                process.exit(0);
            }
        }, 5000);
        
    } catch (e) {
        console.error('Error running crawler:', e);
    }
})();
