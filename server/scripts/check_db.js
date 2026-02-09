"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../src/db/client");
console.log('Checking database...');
try {
    const fileCount = client_1.db.prepare('SELECT COUNT(*) as count FROM FileHandle').get();
    console.log(`FileHandle count: ${fileCount.count}`);
    const indexCount = client_1.db.prepare('SELECT COUNT(*) as count FROM FileContentIndex').get();
    console.log(`FileContentIndex count: ${indexCount.count}`);
    if (indexCount.count > 0) {
        const sample = client_1.db.prepare('SELECT rowid, content FROM FileContentIndex LIMIT 1').get();
        console.log(`Sample index entry (rowid ${sample.rowid}): ${sample.content.substring(0, 50)}...`);
    }
    else {
        console.log('No content indexed.');
    }
    const scopes = client_1.db.prepare('SELECT * FROM Scope').all();
    console.log(`Scopes: ${JSON.stringify(scopes, null, 2)}`);
}
catch (e) {
    console.error('Error checking DB:', e);
}
