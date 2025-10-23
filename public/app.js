// public/app.js
document.addEventListener('DOMContentLoaded', () => {

    const matchGrid = document.getElementById('match-grid');
    const noMatchesMsg = document.getElementById('no-matches-msg');

    // API ကို ခေါ်ပြီး Live ပွဲစဉ် data တွေ တောင်းမယ်
    async function fetchLiveMatches() {
        try {
            // Admin Panel (server.js) က သတ်မှတ်ထားတဲ့ API route
            const response = await fetch('/api/live_matches');
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const matches = await response.json();
            displayMatches(matches);

        } catch (error) {
            console.error('Failed to fetch live matches:', error);
            matchGrid.innerHTML = '<p style="color: red; text-align: center;">Failed to load matches.</p>';
        }
    }

    // ရလာတဲ့ data တွေကို HTML Card တွေအဖြစ် ပြောင်းမယ်
function displayMatches(matches) {
        // အရင် card အဟောင်းတွေ (ရှိခဲ့ရင်) ရှင်းမယ်
        matchGrid.innerHTML = ''; 

        if (matches.length === 0) {
            // Live ပွဲစဉ် မရှိရင် စာတန်းပြမယ်
            noMatchesMsg.style.display = 'block';
        } else {
            // Live ပွဲစဉ် ရှိရင် စာတန်းကို ဖျောက်ထားမယ်
            noMatchesMsg.style.display = 'none';

            // ပွဲစဉ် တစ်ခုချင်းစီအတွက် Card ဆောက်မယ်
            matches.forEach(match => {
                const matchCard = document.createElement('a');
                matchCard.className = 'match-card';
                
                // Card ကို နှိပ်ရင် watch.html ကို stream URL data နဲ့ ပို့မယ်
                const streamUrlEncoded = encodeURIComponent(match.stream_url);
                const matchTitleEncoded = encodeURIComponent(`${match.team_a} vs ${match.team_b}`);
                
                matchCard.href = `watch.html?stream=${streamUrlEncoded}&title=${matchTitleEncoded}`;

                // ===== MODIFIED START =====
                // Logo URL မထည့်ထားခဲ့ရင် default ပုံလေး သုံးမယ်
                const logoA = match.team_a_logo || 'https://via.placeholder.com/50.png?text=A';
                const logoB = match.team_b_logo || 'https://via.placeholder.com/50.png?text=B';

                // Card HTML ဒီဇိုင်းကို Logo တွေနဲ့ ပြင်ဆင်သတ်မှတ်ခြင်း
                matchCard.innerHTML = `
                    <div class="card-header">
                        <span class="league">${match.league || 'Friendly'}</span>
                        <span class="live-dot">LIVE</span>
                    </div>
                    <div class="card-body">
                        <div class="team-info">
                            <img src="${logoA}" alt="${match.team_a} Logo" class="team-logo">
                            <span class="team-name">${match.team_a}</span>
                        </div>
                        <span class="vs-text">vs</span>
                        <div class="team-info">
                            <img src="${logoB}" alt="${match.team_b} Logo" class="team-logo">
                            <span class="team-name">${match.team_b}</span>
                        </div>
                    </div>
                    <div class="play-overlay">
                        <i class="fas fa-play"></i>
                    </div>
                `;
                // ===== MODIFIED END =====
                
                // ဆောက်ပြီးသား card ကို grid ထဲ ထည့်မယ်
                matchGrid.appendChild(matchCard);
            });
        }
    }

    // Page စဖွင့်ဖွင့်ချင်း API ကို စခေါ်မယ်
    fetchLiveMatches();
    
    // စက္ကန့် ၃၀ တိုင်း data အသစ် ထပ်တောင်းမယ် (ပွဲစဉ်အသစ် ဝင်လာ၊ ထွက်သွားတာ သိအောင်)
    setInterval(fetchLiveMatches, 30000); 
});