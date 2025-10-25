// database.js
db.serialize(() => {
    // ... existing table creation ...

    // Highlight table အသစ်
    db.run(`CREATE TABLE IF NOT EXISTS highlights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        thumbnail_url TEXT,
        video_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});
