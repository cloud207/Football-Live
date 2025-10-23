// update_db.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./football.db', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connected to the football.db database.');
});

const alterSql1 = "ALTER TABLE matches ADD COLUMN team_a_logo TEXT";
const alterSql2 = "ALTER TABLE matches ADD COLUMN team_b_logo TEXT";

db.serialize(() => {
    db.run(alterSql1, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('team_a_logo column already exists.');
            } else {
                console.error('Error adding team_a_logo:', err.message);
            }
        } else {
            console.log("Column 'team_a_logo' added successfully.");
        }
    });

    db.run(alterSql2, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('team_b_logo column already exists.');
            } else {
                console.error('Error adding team_b_logo:', err.message);
            }
        } else {
            console.log("Column 'team_b_logo' added successfully.");
        }
    });
});

db.close((err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Closed the database connection.');
});