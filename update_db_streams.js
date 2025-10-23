// update_db_streams.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./football.db', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connected to the football.db database.');
});

const alterSql = "ALTER TABLE matches ADD COLUMN stream_urls TEXT";

db.run(alterSql, (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('stream_urls column already exists.');
        } else {
            console.error('Error adding stream_urls column:', err.message);
        }
    } else {
        console.log("Column 'stream_urls' added successfully.");
    }
});

db.close((err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Closed the database connection.');
});