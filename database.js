// database.js
const sqlite3 = require('sqlite3').verbose();

// 'football.db' ဆိုတဲ့ ဖိုင်နာမည်နဲ့ database ကို ဖွင့်မယ်/ဆောက်မယ်
const db = new sqlite3.Database('./football.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the football.db database.');
});

// Database table ကို တည်ဆောက်မယ့် SQL
const createTableSql = `
CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_a TEXT NOT NULL,
    team_b TEXT NOT NULL,
    league TEXT,
    match_time TEXT NOT NULL,
    stream_url TEXT NOT NULL,
    is_live INTEGER DEFAULT 0 
);
`;
// is_live: 0 = Not Live, 1 = Live

db.run(createTableSql, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log("Matches table created or already exists.");
});

module.exports = db;