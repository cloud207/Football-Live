// server.js
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database.js'); // Database ကို import လုပ်ခြင်း

const app = express();
const PORT = 3000;

// EJS ကို template engine အဖြစ် သတ်မှတ်ခြင်း
app.set('view engine', 'ejs');
// 'views' folder ထဲက ဖိုင်တွေကို ရှာခိုင်းခြင်း
app.set('views', './views');

// Form ကနေ ပို့လိုက်တဲ့ data တွေကို နားလည်အောင် (Parse) လုပ်ခြင်း
app.use(bodyParser.urlencoded({ extended: true }));
// 'public' folder ကို သုံးစွဲသူကို တိုက်ရိုက် ပြသခွင့်ပေးခြင်း
app.use(express.static('public'));

// --- Admin Panel Routes ---

// Admin Panel ပင်မ စာမျက်နှာ (GET request)
// Database ထဲက ပွဲစဉ်အားလုံးကို ဆွဲထုတ်ပြီး 'admin.ejs' ကို ပြပေးမယ်
app.get('/admin', (req, res) => {
    const sql = "SELECT * FROM matches ORDER BY match_time DESC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        // 'admin.ejs' ကို render လုပ်ပြီး 'matches' data ကို ထည့်ပေးလိုက်မယ်
        res.render('admin', { matches: rows });
    });
});

// ပွဲစဉ်အသစ် ထည့်သွင်းခြင်း (POST request)
app.post('/admin/add_match', (req, res) => {
    // Form ကနေ ပို့လိုက်တဲ့ data တွေ
    // ===== MODIFIED START =====
    const { team_a, team_b, league, match_time, stream_url, team_a_logo, team_b_logo } = req.body;
    
    const sql = `INSERT INTO matches (team_a, team_b, league, match_time, stream_url, team_a_logo, team_b_logo, is_live) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0)`; // Default is_live = 0
    
    db.run(sql, [team_a, team_b, league, match_time, stream_url, team_a_logo, team_b_logo], (err) => {
    // ===== MODIFIED END =====
        if (err) {
            return console.error(err.message);
        }
        console.log("A new match has been added.");
        // ပွဲစဉ်ထည့်ပြီးရင် Admin page ကို ပြန်သွားမယ်
        res.redirect('/admin');
    });
});

// ပွဲစဉ်ကို Live/Not Live ပြောင်းခြင်း (GET request)
app.get('/admin/toggle_live/:id', (req, res) => {
    const id = req.params.id;
    
    // လက်ရှိ is_live တန်ဖိုးကို အရင်ရှာမယ်
    db.get("SELECT is_live FROM matches WHERE id = ?", [id], (err, row) => {
        if (err) {
            return console.error(err.message);
        }
        
        // 0 ဖြစ်ရင် 1 ပြောင်း၊ 1 ဖြစ်ရင် 0 ပြောင်း
        const newLiveStatus = row.is_live === 0 ? 1 : 0; 
        
        const updateSql = "UPDATE matches SET is_live = ? WHERE id = ?";
        db.run(updateSql, [newLiveStatus, id], (err) => {
            if (err) {
                return console.error(err.message);
            }
            res.redirect('/admin');
        });
    });
});

// ပွဲစဉ်ကို ဖျက်ခြင်း (GET request)
app.get('/admin/delete/:id', (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM matches WHERE id = ?";
    db.run(sql, [id], (err) => {
        if (err) {
            return console.error(err.message);
        }
        res.redirect('/admin');
    });
});


// --- Public API Route (User Website အတွက်) ---
// User တွေက ဒီ link ကို ခေါ်ပြီး "Live" ဖြစ်နေတဲ့ ပွဲစဉ်တွေကို ယူရမယ်
app.get('/api/live_matches', (req, res) => {
    const sql = "SELECT * FROM matches WHERE is_live = 1";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows); // Data ကို JSON ပုံစံနဲ့ ပြန်ပေးမယ်
    });
});


// Server ကို စတင် Run ခြင်း
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Admin Panel: http://localhost:${PORT}/admin`);
});

