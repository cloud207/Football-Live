// server.js (UPDATED)
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database.js');
const session = require('express-session'); // <-- အသစ်ထပ်ထည့်သည်

const app = express();
const PORT = 3000;

// --- Admin Login Credentials ---
// (လုံခြုံရေးအတွက် ဒီနေရာက username/password ကို ပြောင်းပါ)
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'password123';

// EJS
app.set('view engine', 'ejs');
app.set('views', './views');

// Body Parser
app.use(bodyParser.urlencoded({ extended: true }));
// Static Folder (public)
app.use(express.static('public'));

// --- Session Middleware (အသစ်ထပ်ထည့်သည်) ---
app.use(session({
    secret: 'YOUR_VERY_STRONG_SECRET_KEY', // (ဒီစာတန်းကို ပြောင်းလိုက်ပါ)
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// --- Authentication Middleware (အသစ်ထပ်ထည့်သည်) ---
const checkAuth = (req, res, next) => {
    if (req.session.loggedin) {
        // Login ဝင်ထားရင် ဆက်သွားခွင့်ပြုမယ်
        next();
    } else {
        // Login မဝင်ထားရင် /login page ကို ပို့မယ်
        res.redirect('/login');
    }
};

// --- Login & Logout Routes (အသစ်ထပ်ထည့်သည်) ---

// Login page ကို ပြသခြင်း
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// Login ဝင်မဝင် စစ်ဆေးခြင်း
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        // Login အောင်မြင်ရင် session ကို မှတ်ထားမယ်
        req.session.loggedin = true;
        res.redirect('/admin');
    } else {
        // Login မအောင်မြင်ရင်
        res.render('login', { error: 'Invalid username or password' });
    }
});

// Logout လုပ်ခြင်း
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        res.redirect('/login');
    });
});


// --- Admin Panel Routes (အားလုံးကို checkAuth ဖြင့် ကာကွယ်ထားသည်) ---

// Admin Panel ပင်မ စာမျက်နှာ (checkAuth ထည့်ထား)
app.get('/admin', checkAuth, (req, res) => {
    const sql = "SELECT * FROM matches ORDER BY match_time DESC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        res.render('admin', { matches: rows });
    });
});

// ပွဲစဉ်အသစ် ထည့်သွင်းခြင်း (checkAuth ထည့်ထား)
app.post('/admin/add_match', checkAuth, (req, res) => {
    const { team_a, team_b, league, match_time, stream_url, team_a_logo, team_b_logo } = req.body;
    const sql = `INSERT INTO matches (team_a, team_b, league, match_time, stream_url, team_a_logo, team_b_logo, is_live) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0)`;
    db.run(sql, [team_a, team_b, league, match_time, stream_url, team_a_logo, team_b_logo], (err) => {
        if (err) { return console.error(err.message); }
        res.redirect('/admin');
    });
});

// --- Edit Routes (အသစ်ထပ်ထည့်သည်) ---

// Edit page ကို ပြသခြင်း (checkAuth ထည့်ထား)
app.get('/admin/edit/:id', checkAuth, (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM matches WHERE id = ?";
    db.get(sql, [id], (err, row) => {
        if (err) {
            return console.error(err.message);
        }
        if (!row) {
            return res.redirect('/admin'); // Match မရှိရင် admin page ပြန်ပို့
        }
        // 'edit.ejs' ကို render လုပ်ပြီး 'match' data ကို ထည့်ပေးလိုက်မယ်
        res.render('edit', { match: row });
    });
});

// Edit data တွေကို Update လုပ်ခြင်း (checkAuth ထည့်ထား)
app.post('/admin/edit/:id', checkAuth, (req, res) => {
    const id = req.params.id;
    const { team_a, team_b, league, match_time, stream_url, team_a_logo, team_b_logo } = req.body;
    
    const sql = `UPDATE matches SET 
                    team_a = ?, 
                    team_b = ?, 
                    league = ?, 
                    match_time = ?, 
                    stream_url = ?, 
                    team_a_logo = ?, 
                    team_b_logo = ? 
                 WHERE id = ?`;
                 
    db.run(sql, [team_a, team_b, league, match_time, stream_url, team_a_logo, team_b_logo, id], (err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log(`Match ${id} has been updated.`);
        res.redirect('/admin');
    });
});

// --- Toggle & Delete Routes (checkAuth ထည့်ထား) ---

// ပွဲစဉ်ကို Live/Not Live ပြောင်းခြင်း
app.get('/admin/toggle_live/:id', checkAuth, (req, res) => {
    const id = req.params.id;
    db.get("SELECT is_live FROM matches WHERE id = ?", [id], (err, row) => {
        if (err) { return console.error(err.message); }
        const newLiveStatus = row.is_live === 0 ? 1 : 0; 
        const updateSql = "UPDATE matches SET is_live = ? WHERE id = ?";
        db.run(updateSql, [newLiveStatus, id], (err) => {
            if (err) { return console.error(err.message); }
            res.redirect('/admin');
        });
    });
});

// ပွဲစဉ်ကို ဖျက်ခြင်း
app.get('/admin/delete/:id', checkAuth, (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM matches WHERE id = ?";
    db.run(sql, [id], (err) => {
        if (err) { return console.error(err.message); }
        res.redirect('/admin');
    });
});


// --- Public API Route (ဒါက Login မလိုပါ) ---
app.get('/api/live_matches', (req, res) => {
    const sql = "SELECT * FROM matches WHERE is_live = 1";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});


// Server ကို စတင် Run ခြင်း
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    // Admin login page ကို ညွှန်းပါ
    console.log(`Admin Panel: http://localhost:${PORT}/login`);
});