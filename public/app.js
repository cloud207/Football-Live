// public/app.js
document.addEventListener('DOMContentLoaded', () => {

    const matchGrid = document.getElementById('match-grid');
    const noMatchesMsg = document.getElementById('no-matches-msg');
    const leagueFiltersContainer = document.getElementById('league-filters');

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
            // Filter ခလုတ်တွေ မထပ်အောင် အရင် ရှင်းထုတ်ပါ
            if (leagueFiltersContainer) leagueFiltersContainer.innerHTML = '';

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
                
                // Filter လုပ်ရန်အတွက် data-league attribute ထည့်ပါ
                matchCard.dataset.league = match.league || 'Friendly';

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

        // League Filter ခလုတ်များကို တည်ဆောက်ပါ
        buildLeagueFilters(matches);
    }

    // Page စဖွင့်ဖွင့်ချင်း API ကို စခေါ်မယ်
    fetchLiveMatches();
    
    // စက္ကန့် ၃၀ တိုင်း data အသစ် ထပ်တောင်းမယ်
    setInterval(fetchLiveMatches, 30000); 

    // --- LEAGUE FILTER LOGIC (အသစ်) ---
    function buildLeagueFilters(matches) {
        if (!leagueFiltersContainer) return;

        // League အမည် မထပ်အောင် စုစည်းပါ
        const leagues = ['All', ...new Set(matches.map(m => m.league || 'Friendly'))];

        leagues.forEach(league => {
            const button = document.createElement('button');
            button.className = 'filter-btn';
            button.textContent = league;
            if (league === 'All') {
                button.classList.add('active'); // Default အနေနဲ့ 'All' ကို active လုပ်ထားမယ်
            }
            button.addEventListener('click', () => filterMatchesByLeague(league));
            leagueFiltersContainer.appendChild(button);
        });
    }

    function filterMatchesByLeague(league) {
        const cards = matchGrid.querySelectorAll('.match-card');
        const buttons = leagueFiltersContainer.querySelectorAll('.filter-btn');

        // Active button style ကို ပြောင်းပါ
        buttons.forEach(btn => {
            if (btn.textContent === league) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Card တွေကို ပြ/ဖျောက် လုပ်ပါ
        cards.forEach(card => {
            if (league === 'All' || card.dataset.league === league) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
    // --- END LEAGUE FILTER LOGIC ---

    // ===========================================
    // === UPCOMING MATCHES LOGIC (အသစ်) ===
    // ===========================================

    const upcomingMatchGrid = document.getElementById('upcoming-match-grid');
    const noUpcomingMsg = document.getElementById('no-upcoming-msg');

    // API ကို ခေါ်ပြီး Upcoming ပွဲစဉ် data တွေ တောင်းမယ်
    async function fetchUpcomingMatches() {
        try {
            const response = await fetch('/api/upcoming_matches');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const matches = await response.json();
            displayUpcomingMatches(matches);

        } catch (error) {
            console.error('Failed to fetch upcoming matches:', error);
            upcomingMatchGrid.innerHTML = '<p style="color: red; text-align: center;">Failed to load upcoming matches.</p>';
        }
    }

    // ရလာတဲ့ data တွေကို HTML Card တွေအဖြစ် ပြောင်းမယ်
    function displayUpcomingMatches(matches) {
        upcomingMatchGrid.innerHTML = ''; 

        if (matches.length === 0) {
            noUpcomingMsg.style.display = 'block';
        } else {
            noUpcomingMsg.style.display = 'none';

            matches.forEach(match => {
                // Upcoming ပွဲက နှိပ်လို့ မရတဲ့အတွက် <a> tag အစား <div> tag သုံးပါမယ်
                const matchCard = document.createElement('div');
                matchCard.className = 'match-card upcoming'; // 'upcoming' class အသစ် ထပ်ထည့်

                const logoA = match.team_a_logo || 'https://placehold.co/50x50/333/FFF?text=A';
                const logoB = match.team_b_logo || 'https://placehold.co/50x50/333/FFF?text=B';

                // ပွဲကစားမယ့် အချိန်ကို format လုပ်မယ်
                const matchTime = new Date(match.match_time);
                // ဥပမာ: "10/25, 9:30 PM"
                const formattedTime = matchTime.toLocaleString([], { 
                    month: 'numeric', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });

                // Card HTML ဒီဇိုင်း (Live dot အစား အချိန်ကို ပြမယ်)
                matchCard.innerHTML = `
                    <div class="card-header">
                        <span class="league">${match.league || 'Friendly'}</span>
                        <span class="match-time">${formattedTime}</span>
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
                    `;
                
                upcomingMatchGrid.appendChild(matchCard);
            });
        }
    }

    // Page စဖွင့်ဖွင့်ချင်း API ကို စခေါ်မယ်
    fetchUpcomingMatches();
    
    // ၅ မိနစ် (300000 ms) တိုင်း data အသစ် ထပ်တောင်းမယ်
    setInterval(fetchUpcomingMatches, 300000); 
});