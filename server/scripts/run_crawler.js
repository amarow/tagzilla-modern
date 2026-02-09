"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crawler_1 = require("../src/services/crawler");
const client_1 = require("../src/db/client");
console.log('Starting manual crawler run...');
(async () => {
    try {
        await crawler_1.crawlerService.init();
        // Keep the script alive to let the crawler work
        setInterval(() => {
            const indexCount = client_1.db.prepare('SELECT COUNT(*) as count FROM FileContentIndex').get();
            console.log(`Indexed files: ${indexCount.count}`);
            if (indexCount.count > 100) {
                console.log('Indexed over 100 files, stopping script.');
                process.exit(0);
            }
        }, 5000);
    }
    catch (e) {
        console.error('Error running crawler:', e);
    }
})();
