# Word Index Planning

## Objective
Build a word index for text documents identified by the Crawler.
Users can search for documents by filename OR by content (via checkbox).
**Configurable:** Extensions to index are stored in AppState.

## Technical Implementation Plan

### 1. Database Schema (SQLite FTS5)
*   **Table:** `FileContentIndex` (Virtual Table using FTS5)
    *   Columns: `content`, `fileId` (UNINDEXED)
    *   Tokenizer: `porter` (stemming) or `unicode61`.

### 2. Configuration (Dynamic Extensions)
*   **Storage:** `AppState` table. Key: `search_settings`.
*   **Default Extensions:** `['.txt', '.md', '.markdown', '.json', '.ts', '.js', '.jsx', '.tsx', '.html', '.css', '.scss', '.xml', '.yaml', '.yml', '.sql', '.env']`

### 3. API Endpoints
*   **Search:**
    *   `GET /api/search?q=...&mode=...`
    *   **Modes:**
        *   `filename` (Default): `SELECT * FROM FileHandle WHERE name LIKE %q%`
        *   `content`: `SELECT fileId FROM FileContentIndex WHERE content MATCH q` (JOIN FileHandle)
        *   `hybrid`: Combine results (optional).
*   **Settings:**
    *   `GET /api/settings/search`
    *   `PUT /api/settings/search`

### 4. Crawler Service Update
*   **Logic:**
    1.  Load `allowedExtensions` from DB.
    2.  If file extension matches:
        *   Read content (max 5MB).
        *   Upsert to `FileContentIndex`.

## Steps
1.  **Database:** Create `FileContentIndex` table.
2.  **Repository:** Implement `search` (handling modes) and `upsertContent`.
3.  **API:** Implement search and settings routes.
4.  **Crawler:** Integrate content indexing.
