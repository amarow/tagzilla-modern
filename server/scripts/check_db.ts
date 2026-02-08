import { db } from '../src/db/client';

console.log('Checking database...');

try {
    const fileCount = db.prepare('SELECT COUNT(*) as count FROM FileHandle').get() as { count: number };
    console.log(`FileHandle count: ${fileCount.count}`);

    const indexCount = db.prepare('SELECT COUNT(*) as count FROM FileContentIndex').get() as { count: number };
    console.log(`FileContentIndex count: ${indexCount.count}`);

    if (indexCount.count > 0) {
        const sample = db.prepare('SELECT rowid, content FROM FileContentIndex LIMIT 1').get() as { rowid: number, content: string };
        console.log(`Sample index entry (rowid ${sample.rowid}): ${sample.content.substring(0, 50)}...`);
    } else {
        console.log('No content indexed.');
    }

    const scopes = db.prepare('SELECT * FROM Scope').all();
    console.log(`Scopes: ${JSON.stringify(scopes, null, 2)}`);

} catch (e) {
    console.error('Error checking DB:', e);
}
