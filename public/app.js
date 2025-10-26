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
                const streamsJson = match.stream_urls || '[]';
                const matchTitle = `${match.team_a} vs ${match.team_b}`;
                
                // Filter လုပ်ရန်အတွက် data-league attribute ထည့်ပါ
                matchCard.dataset.league = match.league || 'Friendly';

                // URL မှာ data တွေ မပေါ်အောင် sessionStorage ကိုသုံးပြီး data ပို့ပါမယ်
                matchCard.href = `watch.html`; // URL ကိုရှင်းထုတ်လိုက်ပါပြီ
                matchCard.addEventListener('click', (event) => {
                    event.preventDefault(); // Link ကို တန်းမသွားအောင် တားပါ

                    // Data တွေကို sessionStorage မှာ သိမ်းပါ
                    sessionStorage.setItem('watch_data', JSON.stringify({
                        title: matchTitle,
                        streams: streamsJson
                    }));

                    // watch.html ကို သွားပါ
                    window.location.href = 'watch.html';
                });

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
                // ဥပမာ: "10/25, 9:30 PM" (User's local time)
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

    // ===========================================
    // === HIGHLIGHTS LOGIC (အသစ်) ===
    // ===========================================

    const highlightsGrid = document.getElementById('highlights-grid');
    const noHighlightsMsg = document.getElementById('no-highlights-msg');

    async function fetchHighlights() {
        try {
            // highlight data တောင်းမယ့် API endpoint (server.js မှာ ဖန်တီးရန်)
            const response = await fetch('/api/highlights');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const highlights = await response.json();
            displayHighlights(highlights);

        } catch (error) {
            console.error('Failed to fetch highlights:', error);
            if(highlightsGrid) highlightsGrid.innerHTML = '<p style="color: red; text-align: center;">Failed to load highlights.</p>';
        }
    }

    function displayHighlights(highlights) {
        if (!highlightsGrid) return;
        highlightsGrid.innerHTML = ''; 

        if (highlights.length === 0) {
            if(noHighlightsMsg) noHighlightsMsg.style.display = 'block';
        } else {
            if(noHighlightsMsg) noHighlightsMsg.style.display = 'none';

            highlights.forEach(highlight => {
                const highlightCard = document.createElement('a');
                highlightCard.className = 'highlight-card';
                
                // Thumbnail ပုံကို card ရဲ့ background အဖြစ် သတ်မှတ်
                const thumbnailUrl = highlight.thumbnail_url || 'https://placehold.co/400x225/1a1a1a/ccc?text=Highlight';
                highlightCard.style.backgroundImage = `url('${thumbnailUrl}')`;

                // watch.html ကို data ပို့ရန် event listener
                highlightCard.href = `watch.html`;
                highlightCard.addEventListener('click', (event) => {
                    event.preventDefault();
                    
                    const videoId = getYouTubeVideoId(highlight.video_url);
                    let watchData;

                    if (videoId) {
                        // YouTube video ဖြစ်လျှင်
                        watchData = {
                            title: highlight.title,
                            isYouTube: true,
                            videoId: videoId
                        };
                    } else {
                        // Direct stream (M3U8/MP4) ဖြစ်လျှင်
                        watchData = {
                            title: highlight.title,
                            streams: JSON.stringify([{ name: 'Highlight', url: highlight.video_url }]),
                            isHighlight: true,
                            videoType: highlight.video_url.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'application/x-mpegURL'
                        };
                    }

                    sessionStorage.setItem('watch_data', JSON.stringify(watchData));

                    window.location.href = 'watch.html';
                });

                highlightCard.innerHTML = `
                    ${'' /* YouTube icon ထည့်ရန် */}
                    ${getYouTubeVideoId(highlight.video_url) ? 
                        `<div class="source-icon-overlay">
                            <i class="fab fa-youtube"></i>
                         </div>` 
                        : ''
                    }
                    <div class="overlay">
                        <span class="highlight-title">${highlight.title}</span>
                    </div>
                    <div class="play-overlay"><i class="fas fa-play"></i></div>
                `;
                
                highlightsGrid.appendChild(highlightCard);
            });
        }
    }

    // YouTube URL ကနေ Video ID ကို ထုတ်ယူပေးမယ့် function
    function getYouTubeVideoId(url) {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            return match[2];
        }
        return null;
    }

    // Page စဖွင့်ဖွင့်ချင်း API ကို စခေါ်မယ်
    fetchHighlights();

    // ===========================================
    // === 24/7 CHANNELS LOGIC (အသစ်) ===
    // ===========================================

    const channelsGrid = document.getElementById('channels-grid');
    const noChannelsMsg = document.getElementById('no-channels-msg');

    async function fetchChannels() {
        if (!channelsGrid) return;
        try {
            const response = await fetch('/api/channels');
            if (!response.ok) throw new Error('Network response was not ok');
            
            const channels = await response.json();
            displayChannels(channels);

        } catch (error) {
            console.error('Failed to fetch 24/7 channels:', error);
            channelsGrid.innerHTML = '<p style="color: red; text-align: center;">Failed to load channels.</p>';
        }
    }

    function displayChannels(channels) {
        if (!channelsGrid) return;
        channelsGrid.innerHTML = '';

        if (channels.length === 0) {
            if (noChannelsMsg) noChannelsMsg.style.display = 'block';
        } else {
            if (noChannelsMsg) noChannelsMsg.style.display = 'none';

            channels.forEach(channel => {
                const channelCard = document.createElement('a');
                channelCard.className = 'match-card'; // Re-use match-card style

                // watch.html ကို data ပို့ရန် event listener
                channelCard.href = 'watch.html';
                channelCard.addEventListener('click', (event) => {
                    event.preventDefault();

                    // Data တွေကို sessionStorage မှာ သိမ်းပါ
                    sessionStorage.setItem('watch_data', JSON.stringify({
                        title: channel.name,
                        // Stream တစ်ခုတည်းသာ ရှိတဲ့အတွက် array of object အဖြစ် တည်ဆောက်
                        streams: JSON.stringify([{ name: channel.name, url: channel.stream_url }])
                    }));

                    window.location.href = 'watch.html';
                });

                const logo = channel.logo_url || 'https://placehold.co/100x100/333/FFF?text=TV';

                // Card HTML ဒီဇိုင်းကို Logo တွေနဲ့ ပြင်ဆင်သတ်မှတ်ခြင်း
                channelCard.innerHTML = `
                    <div class="card-body channel-card-body">
                        <div class="team-info">
                            <img src="${logo}" alt="${channel.name} Logo" class="team-logo">
                            <span class="team-name">${channel.name}</span>
                        </div>
                    </div>
                    <div class="play-overlay">
                        <i class="fas fa-play"></i>
                    </div>
                `;
                
                channelsGrid.appendChild(channelCard);
            });
        }
    }

    // Page စဖွင့်ဖွင့်ချင်း API ကို စခေါ်မယ်
    fetchChannels();
    // These channels don't change often, so no need for setInterval
});