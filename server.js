// server.js (FIXED & COMPLETE)
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database.js');
const session = require('express-session');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const PORT = 3000;

// EJS
app.set('view engine', 'ejs');
app.set('views', './views');

// Body Parser
app.use(bodyParser.urlencoded({ extended: true }));
// Static Folder (public)
app.use(express.static('public'));

// --- Session Middleware ---
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// --- Authentication Middleware ---
const checkAuth = (req, res, next) => {
    if (req.session.loggedin) {
        next();
    } else {
        res.redirect('/login');
    }
};

// --- Login & Logout Routes ---

// Login page ကို ပြသခြင်း
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// Login ဝင်မဝင် စစ်ဆေးခြင်း
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        req.session.loggedin = true;
        res.redirect('/admin');
    } else {
        res.render('login', { error: 'Invalid username or password' });
    }
});

// Logout လုပ်ခြင်း
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        res.redirect('/login');
    });
});

// --- Helper function (Stream JSON အတွက်) ---
function buildStreamJson(body) {
    const streams = [];
    // Check if stream_url is an array (from dynamic inputs)
    if (Array.isArray(body.stream_url)) {
        for (let i = 0; i < body.stream_url.length; i++) {
            // Only add if the URL is not empty
            if (body.stream_url[i]) {
                streams.push({ name: body.stream_name[i] || `Stream ${i + 1}`, url: body.stream_url[i] });
            }
        }
    } else if (body.stream_url) { // Fallback for single stream
        streams.push({ name: body.stream_name || 'Stream 1', url: body.stream_url });
    }
    return JSON.stringify(streams);
}


// --- Admin Panel Routes (အားလုံးကို checkAuth ဖြင့် ကာကွယ်ထားသည်) ---

// Admin Panel ပင်မ စာမျက်နှာ (checkAuth ထည့်ထား)
app.get('/admin', checkAuth, (req, res) => {
    const matchesSql = "SELECT * FROM matches ORDER BY match_time DESC";
    const leaguesSql = "SELECT DISTINCT league FROM matches WHERE league IS NOT NULL AND league != '' ORDER BY league";

    db.all(matchesSql, [], (err, matches) => {
        if (err) {
            return res.render('admin', { matches: [], leagues: [], error: err.message });
        }
        db.all(leaguesSql, [], (err, leagues) => {
            if (err) {
                return res.render('admin', { matches: matches, leagues: [], error: err.message });
            }
            res.render('admin', { matches: matches, leagues: leagues, error: req.query.error });
        });
    });
});

// ပွဲစဉ်အသစ် ထည့်သွင်းခြင်း (checkAuth ထည့်ထား)
app.post('/admin/add_match', checkAuth, (req, res) => {
    const { team_a, team_b, league, match_time, team_a_logo, team_b_logo, auto_live } = req.body;
    const streamUrlsJson = buildStreamJson(req.body);
    
    // === FIX START ===
    // column အဟောင်း (stream_url) အတွက် default value တစ်ခု ယူပါ
    const legacyStreamUrl = Array.isArray(req.body.stream_url) ? req.body.stream_url[0] : req.body.stream_url || '';

    // SQL query ထဲ 'stream_url' (အဟောင်း) နဲ့ 'auto_live' ကိုပါ ထပ်ထည့်ပါ
    const sql = `INSERT INTO matches (
                    team_a, team_b, league, match_time, team_a_logo, team_b_logo, 
                    stream_urls, 
                    stream_url,  -- column အဟောင်း (legacy)
                    is_live,
                    auto_live    -- New auto_live column
                 ) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`; // '?' နှစ်ခု ပိုလာပါပြီ
                 
    // db.run ထဲ legacyStreamUrl နဲ့ auto_live ကိုပါ ထပ်ထည့်ပါ
    db.run(sql, [
        team_a, team_b, league, match_time, team_a_logo, team_b_logo, 
        streamUrlsJson,
        legacyStreamUrl, // column အဟောင်းအတွက် value
        auto_live ? 1 : 0 // Checkbox က on/off ဖြစ်လို့ 1/0 ပြောင်း
    ], (err) => {
        // Error handler ကိုပါ ပြင်ထား (Browser မလည်အောင်)
        if (err) { 
            console.error("Failed to add match:", err.message);
            return res.redirect('/admin?error=' + encodeURIComponent(err.message));
        }
        // === FIX END ===
        res.redirect('/admin');
    });
});

// Edit page ကို ပြသခြင်း (checkAuth ထည့်ထား)
app.get('/admin/edit/:id', checkAuth, (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM matches WHERE id = ?";
    const leaguesSql = "SELECT DISTINCT league FROM matches WHERE league IS NOT NULL AND league != '' ORDER BY league";

    db.get(sql, [id], (err, match) => {
        if (err) {
            return res.redirect('/admin?error=' + encodeURIComponent(err.message));
        }
        if (!match) {
            return res.redirect('/admin'); // Match မရှိရင် admin page ပြန်ပို့
        }
        db.all(leaguesSql, [], (err, leagues) => {
            if (err) {
                return res.redirect('/admin?error=' + encodeURIComponent(err.message));
            }
            res.render('edit', { match: match, leagues: leagues });
        });
    });
});

// Edit data တွေကို Update လုပ်ခြင်း (checkAuth ထည့်ထား)
app.post('/admin/edit/:id', checkAuth, (req, res) => {
    const id = req.params.id;
    const { team_a, team_b, league, match_time, team_a_logo, team_b_logo, auto_live } = req.body;
    const streamUrlsJson = buildStreamJson(req.body);

    // === FIX START ===
    // column အဟောင်း (stream_url) အတွက် default value တစ်ခု ယူပါ
    const legacyStreamUrl = Array.isArray(req.body.stream_url) ? req.body.stream_url[0] : req.body.stream_url || '';
    
    // SQL query ထဲ 'stream_url' (အဟောင်း) နဲ့ 'auto_live' ကိုပါ ထပ်ထည့်ပါ
    const sql = `UPDATE matches SET 
                    team_a = ?, 
                    team_b = ?, 
                    league = ?, 
                    match_time = ?, 
                    team_a_logo = ?, 
                    team_b_logo = ?,
                    stream_urls = ?,
                    stream_url = ?,   -- column အဟောင်း (legacy)
                    auto_live = ?     -- New auto_live column
                 WHERE id = ?`;
                 
    // db.run ထဲ legacyStreamUrl နဲ့ auto_live ကိုပါ ထပ်ထည့်ပါ
    db.run(sql, [
        team_a, team_b, league, match_time, team_a_logo, team_b_logo, 
        streamUrlsJson,
        legacyStreamUrl, // column အဟောင်းအတွက် value
        auto_live ? 1 : 0, // Checkbox က on/off ဖြစ်လို့ 1/0 ပြောင်း
        id
    ], (err) => {
        // Error handler ကိုပါ ပြင်ထား (Browser မလည်အောင်)
        if (err) {
            console.error("Failed to update match:", err.message);
            return res.redirect('/admin?error=' + encodeURIComponent(err.message));
        }
        // === FIX END ===
        console.log(`Match ${id} has been updated.`);
        res.redirect('/admin');
    });
});

// --- Change Credentials Routes (New) ---

// Show the form to change credentials
app.get('/admin/change-credentials', checkAuth, (req, res) => {
    res.render('change-credentials', { error: null, message: null });
});

// Handle the form submission
app.post('/admin/change-credentials', checkAuth, (req, res) => {
    const { current_password, new_username, new_password } = req.body;

    // 1. Verify current password
    if (current_password !== process.env.ADMIN_PASS) {
        return res.render('change-credentials', { 
            error: 'Incorrect current password.', 
            message: null 
        });
    }

    // 2. Check if at least one new value is provided
    if (!new_username && !new_password) {
        return res.render('change-credentials', { 
            error: 'Please provide a new username or a new password.', 
            message: null 
        });
    }

    // 3. Update environment variables and .env file
    const newAdminUser = new_username || process.env.ADMIN_USER;
    const newAdminPass = new_password || process.env.ADMIN_PASS;

    try {
        const envPath = path.resolve(__dirname, '.env');
        let envFileContent = fs.readFileSync(envPath, 'utf-8');
        envFileContent = envFileContent.replace(/^ADMIN_USER=.*/m, `ADMIN_USER=${newAdminUser}`);
        envFileContent = envFileContent.replace(/^ADMIN_PASS=.*/m, `ADMIN_PASS=${newAdminPass}`);
        fs.writeFileSync(envPath, envFileContent);

        // Update current process env
        process.env.ADMIN_USER = newAdminUser;
        process.env.ADMIN_PASS = newAdminPass;

        res.render('change-credentials', { error: null, message: 'Credentials updated successfully!' });
    } catch (err) {
        res.render('change-credentials', { error: 'Error writing to .env file. Please check file permissions.', message: null });
    }
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

// --- Highlights Management Routes (New) ---

// Show the highlights management page
app.get('/admin/highlights', checkAuth, (req, res) => {
    const sql = "SELECT * FROM highlights ORDER BY created_at DESC";
    db.all(sql, [], (err, highlights) => {
        if (err) {
            return res.render('admin-highlights', { highlights: [], error: err.message });
        }
        res.render('admin-highlights', { highlights: highlights, error: req.query.error, hlToEdit: undefined });
    });
});

// Add a new highlight
app.post('/admin/highlights/add', checkAuth, (req, res) => {
    const { title, thumbnail_url, video_url } = req.body;
    if (!title || !video_url) {
        return res.redirect('/admin/highlights?error=' + encodeURIComponent('Title and Video URL are required.'));
    }

    const sql = `INSERT INTO highlights (title, thumbnail_url, video_url) VALUES (?, ?, ?)`;
    db.run(sql, [title, thumbnail_url, video_url], (err) => {
        if (err) {
            console.error("Failed to add highlight:", err.message);
            return res.redirect('/admin/highlights?error=' + encodeURIComponent(err.message));
        }
        res.redirect('/admin/highlights');
    });
});

// Show the edit form for a highlight
app.get('/admin/highlights/edit/:id', checkAuth, (req, res) => {
    const id = req.params.id;
    const highlightSql = "SELECT * FROM highlights WHERE id = ?";
    const allHighlightsSql = "SELECT * FROM highlights ORDER BY created_at DESC";

    db.get(highlightSql, [id], (err, hlToEdit) => {
        if (err) {
            return res.redirect('/admin/highlights?error=' + encodeURIComponent(err.message));
        }
        if (!hlToEdit) {
            return res.redirect('/admin/highlights?error=' + encodeURIComponent('Highlight not found.'));
        }
        db.all(allHighlightsSql, [], (err, highlights) => {
            if (err) {
                // Pass the highlight to edit even if fetching the list fails
                return res.render('admin-highlights', { highlights: [], hlToEdit: hlToEdit, error: err.message });
            }
            res.render('admin-highlights', { highlights: highlights, hlToEdit: hlToEdit, error: null });
        });
    });
});

// Handle the update for a highlight
app.post('/admin/highlights/edit/:id', checkAuth, (req, res) => {
    const id = req.params.id;
    const { title, thumbnail_url, video_url } = req.body;

    const sql = `UPDATE highlights SET title = ?, thumbnail_url = ?, video_url = ? WHERE id = ?`;
    db.run(sql, [title, thumbnail_url, video_url, id], (err) => {
        if (err) {
            console.error("Failed to update highlight:", err.message);
            return res.redirect('/admin/highlights?error=' + encodeURIComponent(err.message));
        }
        res.redirect('/admin/highlights');
    });
});

// Delete a highlight
app.get('/admin/highlights/delete/:id', checkAuth, (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM highlights WHERE id = ?";
    db.run(sql, [id], (err) => {
        if (err) {
            console.error("Failed to delete highlight:", err.message);
            return res.redirect('/admin/highlights?error=' + encodeURIComponent(err.message));
        }
        res.redirect('/admin/highlights');
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

// --- Public API Route (Upcoming Matches) ---
app.get('/api/upcoming_matches', (req, res) => {
    // is_live = 0 (live မလွှင့်သေး)
    // AND match_time က အခုလက်ရှိအချိန်ထက် ပိုကြီး (နောက်ကျ)
    // ORDER BY match_time ASC (အနီးဆုံးပွဲကို အရင်ပြ)
    const sql = `
        SELECT * FROM matches 
        WHERE 
            is_live = 0 AND 
            datetime(match_time) > datetime('now')
        ORDER BY match_time ASC
        LIMIT 10`; // (ပွဲတွေ အရမ်းများမနေအောင် ၁၀ ပွဲပဲ ကန့်သတ်ထားမယ်)

    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows); // Data ကို JSON ပုံစံနဲ့ ပြန်ပေးမယ်
    });
});

// --- Public API Route (Highlights) ---
app.get('/api/highlights', (req, res) => { // This was already here from a previous step
    const sql = "SELECT * FROM highlights ORDER BY created_at DESC LIMIT 12"; // နောက်ဆုံး ၁၂ ခုပဲပြမယ်
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// --- Auto-Live Scheduler ---
// 1 မိနစ် (60000 ms) တိုင်း database ကို စစ်ဆေးပြီး ပွဲချိန်ရောက်ရင် Live ပြောင်းပေးမယ်
setInterval(() => {
    // FIX: 'now' ကို UTC အဖြစ် သတ်မှတ်မယ့်အစား 'localtime' modifier ကိုသုံးပြီး server ရဲ့ local time နဲ့ နှိုင်းယှဉ်ပါမယ်။
    const sql = `
        UPDATE matches
        SET is_live = 1
        WHERE 
            is_live = 0 AND 
            auto_live = 1 AND 
            datetime(match_time) <= datetime('now', 'localtime')
    `;
    db.run(sql, [], function(err) { // `now` variable မလိုတော့ပါ
        if (err) {
            console.error('Auto-Live Scheduler Error:', err.message);
        } else if (this.changes > 0) {
            console.log(`Auto-Live Scheduler: ${this.changes} match(es) set to live.`);
        }
    });
}, 60000); // 1 မိနစ် (60000 ms) တိုင်း run ပါမည်




// Server ကို စတင် Run ခြင်း
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    // Admin login page ကို ညွှန်းပါ
    console.log(`Admin Panel: http://localhost:${PORT}/login`);
});