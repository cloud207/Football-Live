// update_schema.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./football.db', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connected to the football.db database.');
});

const alterSql = "ALTER TABLE matches ADD COLUMN auto_live INTEGER DEFAULT 0";

db.run(alterSql, (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('"auto_live" column already exists.');
        } else {
            console.error('Error adding "auto_live" column:', err.message);
        }
    } else {
        console.log('Column "auto_live" added successfully.');
    }

    // Close the database connection
    db.close((err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Closed the database connection.');
    });
});
