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
        matchGrid.innerHTML = ''; 

        if (matches.length === 0) {
            noMatchesMsg.style.display = 'block';
        } else {
            noMatchesMsg.style.display = 'none';

            matches.forEach(match => {
                const matchCard = document.createElement('a');
                matchCard.className = 'match-card';
                
                // Database က stream_urls (JSON string) ကို ယူမယ်
                const streamsJson = match.stream_urls;
                
                // ပထမဆုံး stream link ကို default အဖြစ် ယူမယ်
                let defaultStreamUrl = '';
                try {
                    const streams = JSON.parse(streamsJson);
                    if (streams && streams.length > 0) {
                        defaultStreamUrl = streams[0].url; // ပထမဆုံး link ကို default
                    }
                } catch (e) {
                    console.error('No streams found for match', match.id);
                }

                // watch.html ကို stream link အားလုံး (JSON string) နဲ့ default link ကို ပို့မယ်
                const streamUrlEncoded = encodeURIComponent(defaultStreamUrl);
                const allStreamsEncoded = encodeURIComponent(streamsJson); // Stream list အားလုံး
                const matchTitleEncoded = encodeURIComponent(`${match.team_a} vs ${match.team_b}`);
                
                matchCard.href = `watch.html?stream=${streamUrlEncoded}&title=${matchTitleEncoded}&all_streams=${allStreamsEncoded}`;

                // Logo URL မထည့်ထားခဲ့ရင် default ပုံလေး သုံးမယ်
                const logoA = match.team_a_logo || 'https://placehold.co/50x50/333/FFF?text=A';
                const logoB = match.team_b_logo || 'https://placehold.co/50x50/333/FFF?text=B';

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
                
                matchGrid.appendChild(matchCard);
            });
        }
    }

    // Page စဖွင့်ဖွင့်ချင်း API ကို စခေါ်မယ်
    fetchLiveMatches();
    
    // စက္ကန့် ၃၀ တိုင်း data အသစ် ထပ်တောင်းမယ်
    setInterval(fetchLiveMatches, 30000); 
});