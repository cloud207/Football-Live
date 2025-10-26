// database.js
const sqlite3 = require('sqlite3').verbose();

// 'football.db' ဆိုတဲ့ ဖိုင်နာမည်နဲ့ database ကို ဖွင့်မယ်/ဆောက်မယ်
const db = new sqlite3.Database('./football.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the football.db database.');
});

db.serialize(() => {
    // Database table ကို တည်ဆောက်မယ့် SQL
    const createTableSql = `
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            team_a TEXT NOT NULL,
            team_b TEXT NOT NULL,
            league TEXT,
            match_time TEXT NOT NULL,
            stream_url TEXT,
            is_live INTEGER DEFAULT 0,
            team_a_logo TEXT,
            team_b_logo TEXT,
            stream_urls TEXT,
            auto_live INTEGER DEFAULT 0
        )
    `;
    db.run(createTableSql, (err) => { if (err) console.error("Error creating matches table:", err.message); });
    
    // Highlight table အသစ်
    db.run(`CREATE TABLE IF NOT EXISTS highlights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        thumbnail_url TEXT,
        video_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 24/7 Channels table (New)
    db.run(`CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        logo_url TEXT,
        stream_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

module.exports = db;