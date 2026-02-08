import { db } from '../src/db/client';

console.log('Testing FTS...');

try {
    // 1. Create a dummy file handle
    const stmt = db.prepare("INSERT INTO FileHandle (scopeId, path, name, extension, size, mimeType, updatedAt) VALUES (12, '/tmp/test.txt', 'test.txt', '.txt', 100, 'text/plain', CURRENT_TIMESTAMP)");
    const info = stmt.run();
    const fileId = info.lastInsertRowid as number;
    console.log(`Created dummy file with ID: ${fileId}`);

    // 2. Insert into FTS
    const ftsStmt = db.prepare('INSERT INTO FileContentIndex(rowid, content) VALUES (?, ?)');
    ftsStmt.run(fileId, 'Hello world from FTS test');
    console.log('Inserted into FTS');

    // 3. Search
    const searchStmt = db.prepare("SELECT * FROM FileContentIndex WHERE content MATCH 'Hello'");
    const results = searchStmt.all();
    console.log(`Search results for 'Hello': ${results.length}`);
    if (results.length > 0) {
        console.log(results[0]);
    }

    // Cleanup
    db.prepare('DELETE FROM FileHandle WHERE id = ?').run(fileId);
    db.prepare('DELETE FROM FileContentIndex WHERE rowid = ?').run(fileId);
    console.log('Cleanup done');

} catch (e) {
    console.error('Error testing FTS:', e);
}
