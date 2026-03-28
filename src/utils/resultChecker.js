import axios from 'axios';

// ═══════════════════════════════════════════════════════════════
// 🏆 Multi-Source Result Checker v3.0
// ═══════════════════════════════════════════════════════════════
// Features:
//   ✅ 5 kaynak (TheSportsDB → ESPN → Team History → Web Search → SofaScore)
//   ✅ Spor bazlı akıllı yönlendirme (Futbol, Basketbol, Tenis, Hokey)
//   ✅ Aynı maç için tek API çağrısı (cache/dedup)
//   ✅ Fuzzy takım adı eşleştirme
//   ✅ Paralel API çağrıları (hız optimizasyonu)
//   ✅ Akıllı Retry (farklı isim varyasyonları, retryCount takibi)
//   ✅ Web Search fallback (DuckDuckGo ile skor arama)
//   ✅ SofaScore API desteği
// ═══════════════════════════════════════════════════════════════

const MAX_RETRIES = 5; // Maksimum retry sayısı

// ── In-Memory Cache ──
// Aynı maç birden fazla bahiste geçiyorsa tekrar API çağrısı yapma
const resultCache = new Map();

// ── API Endpoints ──
const SPORTSDB_SEARCH = 'https://www.thesportsdb.com/api/v1/json/3/searchevents.php';
const SPORTSDB_PAST = 'https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php';

// ESPN Unofficial API (no key needed)
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

// ESPN League IDs for soccer
const ESPN_SOCCER_LEAGUES = [
    'eng.1',   // Premier League
    'esp.1',   // La Liga
    'ita.1',   // Serie A
    'ger.1',   // Bundesliga
    'fra.1',   // Ligue 1
    'uefa.champions', // Champions League
    'uefa.europa',    // Europa League
    'uefa.europa.conf', // Conference League
    'eng.2',   // Championship
    'eng.fa',  // FA Cup
    'eng.league_cup', // League Cup
    'tur.1',   // Turkish Super Lig
    'por.1',   // Portuguese Liga
    'ned.1',   // Eredivisie
    'uefa.nations', // Nations League
    'fifa.worldq.uefa', // World Cup Qualifiers
    'fifa.friendly', // Friendlies
];

// ESPN League IDs for basketball
const ESPN_BASKETBALL_LEAGUES = [
    'nba',
    'wnba',
];

// ESPN Hockey
const ESPN_HOCKEY_LEAGUES = ['nhl'];

// ── Team Name Normalization ──
const TEAM_ALIASES = {
    // English Football
    'man united': 'Manchester United', 'man utd': 'Manchester United',
    'man city': 'Manchester City',
    'wolves': 'Wolverhampton Wanderers',
    'spurs': 'Tottenham Hotspur', 'tottenham': 'Tottenham Hotspur',
    'brighton': 'Brighton and Hove Albion',
    'west ham': 'West Ham United',
    'crystal palace': 'Crystal Palace',
    'aston villa': 'Aston Villa',
    'leicester': 'Leicester City',
    'newcastle': 'Newcastle United',
    'nottingham': 'Nottingham Forest',
    'bournemouth': 'AFC Bournemouth',
    'leeds': 'Leeds United',
    'west brom': 'West Bromwich Albion',

    // European Football
    'inter milan': 'Inter Milan', 'inter': 'Inter Milan',
    'atletico madrid': 'Atletico Madrid', 'atletico': 'Atletico Madrid',
    'dortmund': 'Borussia Dortmund',
    'bayern': 'Bayern Munich', 'bayern munich': 'Bayern Munich',
    'psg': 'Paris Saint-Germain',
    'napoli': 'SSC Napoli',
    'roma': 'AS Roma',
    'lazio': 'SS Lazio',
    'monaco': 'AS Monaco',
    'braga': 'SC Braga',
    'porto': 'FC Porto',
    'lille': 'Lille OSC',
    'marseille': 'Olympique Marseille',
    'nice': 'OGC Nice',
    'villarreal': 'Villarreal CF',
    'malmo': 'Malmo FF',
    'fenerbahce': 'Fenerbahce',
    'olympiacos': 'Olympiacos',
    'eintracht': 'Eintracht Frankfurt',
    'celta de vigo': 'Celta de Vigo', 'celta': 'Celta de Vigo',
    'rayo': 'Rayo Vallecano',
    'osasuna': 'CA Osasuna',
    'galatasaray': 'Galatasaray',
    'paok': 'PAOK FC',
    'bayer': 'Bayer Leverkusen', 'leverkusen': 'Bayer Leverkusen',
    'qarabag': 'Qarabag FK',
    'real madrid': 'Real Madrid',
    'real betis': 'Real Betis',
    'werder bremen': 'Werder Bremen',
    'girona': 'Girona FC',
    'getafe': 'Getafe CF',
    'bologna': 'Bologna FC',
    'como': 'Como 1907',
    'milan': 'AC Milan',
    'juventus': 'Juventus',
    'genoa': 'Genoa CFC',
    'rangers': 'Rangers FC',

    // Basketball
    'efes': 'Anadolu Efes', 'anadolu efes': 'Anadolu Efes',
    'zvezda': 'Crvena Zvezda', 'crvena zvezda': 'Crvena Zvezda',
    'asvel': 'ASVEL Lyon-Villeurbanne',
    'olimpia milano': 'AX Armani Exchange Milan',
    'fenerbahce beko': 'Fenerbahce',
    'zalgiris': 'Zalgiris Kaunas',
    'hapoel': 'Hapoel Jerusalem',
    'knicks': 'New York Knicks',
    'cavaliers': 'Cleveland Cavaliers',
    'pacers': 'Indiana Pacers',
    'hornets': 'Charlotte Hornets',

    // Hockey
    'penguins': 'Pittsburgh Penguins',
    'predators': 'Nashville Predators',
    'knights': 'Vegas Golden Knights',

    // Tennis (players)
    'alcaraz': 'Carlos Alcaraz',
    'sinner': 'Jannik Sinner',
    'musetti': 'Lorenzo Musetti',
    'auger': 'Felix Auger-Aliassime',
    'zverev': 'Alexander Zverev',
    'bublik': 'Alexander Bublik',
    'de minaur': 'Alex de Minaur',
    'cerundolo': 'Francisco Cerundolo',
    'darderi': 'Luciano Darderi',
};

/**
 * Detect sport type from bet data
 */
const detectSport = (bet) => {
    const sport = (bet.sport || '').toLowerCase();
    const match = (bet.match || '').toLowerCase();

    if (sport.includes('basket') || sport.includes('nba') || sport.includes('euroleague'))
        return 'basketball';
    if (sport.includes('tennis') || sport.includes('atp') || sport.includes('wta'))
        return 'tennis';
    if (sport.includes('hockey') || sport.includes('nhl') || sport.includes('ice'))
        return 'hockey';
    if (sport.includes('football') || sport.includes('soccer') || sport.includes('futbol'))
        return 'football';

    // Heuristic detection from match name
    const basketballTeams = ['knicks', 'cavaliers', 'pacers', 'hornets', 'efes', 'zvezda', 'asvel',
        'olimpia milano', 'fenerbahce', 'zalgiris', 'hapoel', 'dubai', 'monaco basket'];
    const hockeyTeams = ['penguins', 'predators', 'knights', 'rangers'];
    const tennisPlayers = ['alcaraz', 'sinner', 'musetti', 'auger', 'zverev', 'bublik',
        'de minaur', 'cerundolo', 'darderi', 'djokovic', 'nadal', 'medvedev',
        'tsitsipas', 'rublev', 'ruud', 'fritz', 'tiafoe', 'mpetshi', 'cazaux',
        'zhang', 'kessler', 'kostyuk', 'mboko', 'alexandrova', 'spizzirri', 'zandschulp'];

    if (tennisPlayers.some(p => match.includes(p))) return 'tennis';
    if (basketballTeams.some(t => match.includes(t))) return 'basketball';
    if (hockeyTeams.some(t => match.includes(t))) return 'hockey';

    return 'football'; // Default
};

/**
 * Normalize a team/player name for API searching
 */
const normalizeTeamName = (name) => {
    if (!name) return '';
    const cleaned = name.replace(/[\u{1F1E0}-\u{1F1FF}\u{1F3F4}\u{E0061}-\u{E007A}\u{E007F}]/gu, '').trim();
    const lower = cleaned.toLowerCase();
    return TEAM_ALIASES[lower] || cleaned;
};

/**
 * Fuzzy match: Check if two names are similar enough (Levenshtein-like)
 */
const fuzzyMatch = (nameA, nameB) => {
    if (!nameA || !nameB) return false;
    const a = nameA.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const b = nameB.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

    // Exact match
    if (a === b) return true;
    // One contains the other
    if (a.includes(b) || b.includes(a)) return true;

    // Word-level matching (at least 1 significant word matches)
    const wordsA = a.split(/\s+/).filter(w => w.length > 2);
    const wordsB = b.split(/\s+/).filter(w => w.length > 2);
    const commonWords = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)));
    if (commonWords.length > 0) return true;

    return false;
};

/**
 * Parse "Team A VS Team B" into two team names
 */
const parseMatchTeams = (matchStr) => {
    if (!matchStr) return null;
    const parts = matchStr.split(/\s+(?:VS|vs|v\.?s\.?|–|-)\s+/i);
    if (parts.length !== 2) return null;
    return {
        home: normalizeTeamName(parts[0].trim()),
        away: normalizeTeamName(parts[1].trim()),
        homeRaw: parts[0].trim(),
        awayRaw: parts[1].trim()
    };
};

// ═══════════════════════════════════════════════════════════════
// 🔌 API Provider 1: TheSportsDB (Primary)
// ═══════════════════════════════════════════════════════════════
const searchTheSportsDB = async (teams, betDate) => {
    const searchVariants = [
        `${teams.home} vs ${teams.away}`,
        `${teams.away} vs ${teams.home}`,
        teams.home,
        teams.away,
    ];

    for (const query of searchVariants) {
        try {
            const response = await axios.get(SPORTSDB_SEARCH, {
                params: { e: query },
                timeout: 8000
            });

            if (!response.data?.event) continue;

            const match = findBestMatch(response.data.event, teams, betDate,
                e => ({
                    score: `${e.intHomeScore}-${e.intAwayScore}`,
                    homeScore: parseInt(e.intHomeScore),
                    awayScore: parseInt(e.intAwayScore),
                    homeTeam: e.strHomeTeam,
                    awayTeam: e.strAwayTeam,
                    date: e.dateEvent,
                    sport: e.strSport,
                    league: e.strLeague,
                    source: 'TheSportsDB'
                }),
                e => e.intHomeScore !== null && e.intHomeScore !== '' &&
                    e.intAwayScore !== null && e.intAwayScore !== ''
            );

            if (match) return match;
        } catch (e) { /* continue to next variant */ }
    }
    return null;
};

// ═══════════════════════════════════════════════════════════════
// 🔌 API Provider 2: ESPN (Secondary - No Key Required)
// ═══════════════════════════════════════════════════════════════
const searchESPN = async (teams, betDate, sportType) => {
    if (!betDate) return null;

    const betDateObj = new Date(betDate);
    // ESPN date format: YYYYMMDD
    const dateStr = betDateObj.toISOString().slice(0, 10).replace(/-/g, '');
    // Also check +/- 1 day in case of timezone differences
    const prevDate = new Date(betDateObj.getTime() - 86400000).toISOString().slice(0, 10).replace(/-/g, '');
    const nextDate = new Date(betDateObj.getTime() + 86400000).toISOString().slice(0, 10).replace(/-/g, '');
    const datesToCheck = [dateStr, prevDate, nextDate];

    let leagues = [];
    let sportPath = '';

    switch (sportType) {
        case 'basketball':
            sportPath = 'basketball';
            leagues = ESPN_BASKETBALL_LEAGUES;
            break;
        case 'hockey':
            sportPath = 'hockey';
            leagues = ESPN_HOCKEY_LEAGUES;
            break;
        case 'tennis':
            // ESPN tennis scoreboards are less reliable for player matching
            // Try ATP and WTA
            try {
                for (const dateCheck of datesToCheck) {
                    for (const tour of ['atp', 'wta']) {
                        const result = await searchESPNTennis(teams, tour, dateCheck);
                        if (result) return result;
                    }
                }
            } catch (e) { /* fall through */ }
            return null;
        default:
            sportPath = 'soccer';
            leagues = ESPN_SOCCER_LEAGUES;
    }

    // Try each date and league
    for (const dateCheck of datesToCheck) {
        for (const league of leagues) {
            try {
                const url = `${ESPN_BASE}/${sportPath}/${league}/scoreboard`;
                const response = await axios.get(url, {
                    params: { dates: dateCheck, limit: 100 },
                    timeout: 6000
                });

                if (!response.data?.events) continue;

                for (const event of response.data.events) {
                    const comp = event.competitions?.[0];
                    if (!comp || comp.status?.type?.name !== 'STATUS_FINAL') continue;

                    const espnHome = comp.competitors?.find(c => c.homeAway === 'home');
                    const espnAway = comp.competitors?.find(c => c.homeAway === 'away');

                    if (!espnHome || !espnAway) continue;

                    const homeName = espnHome.team?.displayName || espnHome.team?.name || '';
                    const awayName = espnAway.team?.displayName || espnAway.team?.name || '';

                    // Check if teams match (either direction)
                    const matchesForward = (fuzzyMatch(homeName, teams.home) && fuzzyMatch(awayName, teams.away));
                    const matchesReverse = (fuzzyMatch(homeName, teams.away) && fuzzyMatch(awayName, teams.home));

                    if (matchesForward || matchesReverse) {
                        const homeScore = parseInt(espnHome.score);
                        const awayScore = parseInt(espnAway.score);

                        // If the teams are reversed in ESPN vs our bet, swap scores
                        if (matchesReverse) {
                            return {
                                score: `${awayScore}-${homeScore}`,
                                homeScore: awayScore,
                                awayScore: homeScore,
                                homeTeam: awayName,
                                awayTeam: homeName,
                                date: event.date,
                                sport: sportType,
                                league: league,
                                source: 'ESPN'
                            };
                        }

                        return {
                            score: `${homeScore}-${awayScore}`,
                            homeScore,
                            awayScore,
                            homeTeam: homeName,
                            awayTeam: awayName,
                            date: event.date,
                            sport: sportType,
                            league: league,
                            source: 'ESPN'
                        };
                    }
                }
            } catch (e) { /* continue to next league */ }
        }
    }

    return null;
};

/**
 * ESPN Tennis specific search
 */
const searchESPNTennis = async (teams, tour, dateStr) => {
    try {
        const url = `${ESPN_BASE}/tennis/${tour}/scoreboard`;
        const response = await axios.get(url, {
            params: { dates: dateStr },
            timeout: 6000
        });

        if (!response.data?.events) return null;

        for (const event of response.data.events) {
            const comp = event.competitions?.[0];
            if (!comp || comp.status?.type?.name !== 'STATUS_FINAL') continue;

            const players = comp.competitors || [];
            if (players.length !== 2) continue;

            const p1Name = players[0].athlete?.displayName || players[0].team?.name || '';
            const p2Name = players[1].athlete?.displayName || players[1].team?.name || '';

            const matchesForward = (fuzzyMatch(p1Name, teams.home) && fuzzyMatch(p2Name, teams.away));
            const matchesReverse = (fuzzyMatch(p1Name, teams.away) && fuzzyMatch(p2Name, teams.home));

            if (matchesForward || matchesReverse) {
                // Tennis scores: count sets
                const p1Sets = parseInt(players[0].score || '0');
                const p2Sets = parseInt(players[1].score || '0');

                if (matchesForward) {
                    return {
                        score: `${p1Sets}-${p2Sets}`,
                        homeScore: p1Sets,
                        awayScore: p2Sets,
                        homeTeam: p1Name,
                        awayTeam: p2Name,
                        date: event.date,
                        sport: 'tennis',
                        league: tour.toUpperCase(),
                        source: 'ESPN'
                    };
                } else {
                    return {
                        score: `${p2Sets}-${p1Sets}`,
                        homeScore: p2Sets,
                        awayScore: p1Sets,
                        homeTeam: p2Name,
                        awayTeam: p1Name,
                        date: event.date,
                        sport: 'tennis',
                        league: tour.toUpperCase(),
                        source: 'ESPN'
                    };
                }
            }
        }
    } catch (e) { /* not found */ }
    return null;
};

// ═══════════════════════════════════════════════════════════════
// 🔌 API Provider 3: TheSportsDB Search by Team (Last Resort)
// Uses "past events by team" endpoint for broader coverage
// ═══════════════════════════════════════════════════════════════
const searchTheSportsDBByTeam = async (teams, betDate) => {
    // Search for team by name first to get the team ID
    const variants = [teams.home, teams.away, teams.homeRaw, teams.awayRaw];

    for (const teamName of variants) {
        try {
            // Search team
            const teamResponse = await axios.get('https://www.thesportsdb.com/api/v1/json/3/searchteams.php', {
                params: { t: teamName },
                timeout: 6000
            });

            if (!teamResponse.data?.teams?.[0]) continue;

            const teamId = teamResponse.data.teams[0].idTeam;

            // Get last 5 events for this team
            const eventsResponse = await axios.get(`https://www.thesportsdb.com/api/v1/json/3/eventslast.php`, {
                params: { id: teamId },
                timeout: 6000
            });

            if (!eventsResponse.data?.results) continue;

            const match = findBestMatch(eventsResponse.data.results, teams, betDate,
                e => ({
                    score: `${e.intHomeScore}-${e.intAwayScore}`,
                    homeScore: parseInt(e.intHomeScore),
                    awayScore: parseInt(e.intAwayScore),
                    homeTeam: e.strHomeTeam,
                    awayTeam: e.strAwayTeam,
                    date: e.dateEvent,
                    sport: e.strSport,
                    league: e.strLeague,
                    source: 'TheSportsDB-Team'
                }),
                e => e.intHomeScore !== null && e.intHomeScore !== '' &&
                    e.intAwayScore !== null && e.intAwayScore !== ''
            );

            if (match) return match;
        } catch (e) { /* continue to next variant */ }
    }
    return null;
};

// ═══════════════════════════════════════════════════════════════
// 🔌 API Provider 4: Web Search (Brave Search + DuckDuckGo)
// Son çare olarak web aramasıyla skor bulma
// ═══════════════════════════════════════════════════════════════
const searchWebFallback = async (teams, betDate, sportType) => {
    const betDateObj = betDate ? new Date(betDate) : null;
    const dateHint = betDateObj
        ? betDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : '';

    const sportHint = sportType === 'tennis' ? 'tennis' :
        sportType === 'basketball' ? 'basketball' :
            sportType === 'hockey' ? 'hockey' : 'football';

    const searchQueries = [
        `${teams.homeRaw} vs ${teams.awayRaw} ${sportHint} score ${dateHint}`,
        `${teams.home} vs ${teams.away} final score result`,
        `${teams.homeRaw} ${teams.awayRaw} match result ${dateHint}`,
    ];

    for (const query of searchQueries) {
        // Try Brave Search first (works best, no CAPTCHA/blocks)
        try {
            const result = await searchSingleSource(
                'https://search.brave.com/search',
                { q: query },
                teams, betDate, sportType
            );
            if (result) return result;
        } catch (e) { /* continue */ }

        // Then DuckDuckGo HTML as fallback
        try {
            const result = await searchSingleSource(
                'https://html.duckduckgo.com/html/',
                { q: query },
                teams, betDate, sportType
            );
            if (result) return result;
        } catch (e) { /* continue */ }

        await new Promise(r => setTimeout(r, 500));
    }
    return null;
};

/**
 * Search a single source URL and parse the score from HTML
 */
const searchSingleSource = async (url, params, teams, betDate, sportType) => {
    const response = await axios.get(url, {
        params,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 10000
    });

    const html = response.data;
    return parseScoreFromHTML(html, teams, betDate, sportType);
};

/**
 * Parse score from search engine HTML results (Google + DuckDuckGo)
 */
const parseScoreFromHTML = (html, teams, betDate, sportType) => {
    // Strip all HTML tags and decode entities to get clean text
    const cleanText = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')      // Remove scripts
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')          // Remove styles
        .replace(/<[^>]*>/g, ' ')                                 // Remove tags
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ')                                    // Collapse whitespace
        .toLowerCase();

    if (!cleanText || cleanText.length < 50) return null;

    const homeLower = teams.homeRaw.toLowerCase().trim();
    const awayLower = teams.awayRaw.toLowerCase().trim();
    const homeNorm = teams.home.toLowerCase().trim();
    const awayNorm = teams.away.toLowerCase().trim();

    // Helper: construct a result object
    const makeResult = (hScore, aScore) => ({
        score: `${hScore}-${aScore}`,
        homeScore: hScore, awayScore: aScore,
        homeTeam: teams.homeRaw, awayTeam: teams.awayRaw,
        date: betDate, sport: sportType, league: 'Unknown', source: 'WebSearch'
    });

    // Sanity check for scores based on sport
    const isSane = (s1, s2) => {
        if (sportType === 'basketball') return s1 <= 200 && s2 <= 200;
        if (sportType === 'tennis') return s1 <= 5 && s2 <= 5;  // Max 5 sets
        return s1 <= 15 && s2 <= 15; // Football/Hockey
    };

    // ── Strategy A: "TeamA defeated/beat TeamB X-Y" or "TeamA won X-Y vs TeamB" ──
    const winVerbs = ['defeated', 'beat', 'beats', 'downs', 'edges', 'eliminates', 'overcame', 'topped', 'won'];
    for (const verb of winVerbs) {
        // "[Home] defeated [Away] 6-4, 6-2" or "[Home] beat [Away] 2-1"
        for (const [t1, t2, isReversed] of [[homeLower, awayLower, false], [awayLower, homeLower, true],
        [homeNorm, awayNorm, false], [awayNorm, homeNorm, true]]) {
            // Look for pattern in text
            const t1Esc = escapeRegex(t1);
            const t2Esc = escapeRegex(t2);

            // Pattern: "TeamA defeated TeamB X-Y" or with score like "6-4, 6-2"
            const patterns = [
                new RegExp(`${t1Esc}[^.]{0,30}${verb}[^.]{0,30}${t2Esc}[^.]{0,40}?(\\d+)\\s*[-–]\\s*(\\d+)`, 'i'),
                new RegExp(`${t1Esc}[^.]{0,30}${verb}[^.]{0,30}${t2Esc}[^.]{0,40}?(\\d+)\\s*[-–]\\s*(\\d+)\\s*,\\s*(\\d+)\\s*[-–]\\s*(\\d+)`, 'i'),
            ];

            for (const pat of patterns) {
                const m = cleanText.match(pat);
                if (m) {
                    if (m[3] && m[4]) {
                        // Tennis set scores: count sets won
                        let t1Sets = 0, t2Sets = 0;
                        // Parse all comma-separated set scores
                        const fullMatch = cleanText.substring(m.index, m.index + m[0].length + 40);
                        const setScoRes = fullMatch.match(/(\d+)\s*[-–]\s*(\d+)/g) || [];
                        for (const setScore of setScoRes) {
                            const [s1, s2] = setScore.split(/[-–]/).map(Number);
                            if (s1 > s2) t1Sets++;
                            else if (s2 > s1) t2Sets++;
                        }
                        if (t1Sets > 0 || t2Sets > 0) {
                            return isReversed ? makeResult(t2Sets, t1Sets) : makeResult(t1Sets, t2Sets);
                        }
                    } else {
                        // Simple score
                        const s1 = parseInt(m[1]), s2 = parseInt(m[2]);
                        if (isSane(s1, s2)) {
                            // Winner verb: t1 is the winner, so t1 has s1 if s1 > s2
                            const winnerScore = Math.max(s1, s2);
                            const loserScore = Math.min(s1, s2);
                            return isReversed ? makeResult(loserScore, winnerScore) : makeResult(winnerScore, loserScore);
                        }
                    }
                }
            }
        }
    }

    // ── Strategy B: "score of X-Y" or "ended X-Y" or "final score X-Y" near team names ──
    const scoreContextRegex = /(?:score|ended|final|result|finished)[^.]{0,30}?(\d{1,3})\s*[-–:]\s*(\d{1,3})/gi;
    let ctxMatch;
    const homeWords = homeLower.split(/\s+/).filter(w => w.length > 2);
    const awayWords = awayLower.split(/\s+/).filter(w => w.length > 2);

    while ((ctxMatch = scoreContextRegex.exec(cleanText)) !== null) {
        const context = cleanText.substring(
            Math.max(0, ctxMatch.index - 120),
            Math.min(cleanText.length, ctxMatch.index + ctxMatch[0].length + 120)
        );

        const hasHome = homeWords.some(w => context.includes(w));
        const hasAway = awayWords.some(w => context.includes(w));

        if (hasHome && hasAway) {
            const s1 = parseInt(ctxMatch[1]), s2 = parseInt(ctxMatch[2]);
            if (!isSane(s1, s2)) continue;

            // Determine team order from context
            const homeIdx = Math.min(...homeWords.map(w => { const i = context.indexOf(w); return i >= 0 ? i : Infinity; }));
            const awayIdx = Math.min(...awayWords.map(w => { const i = context.indexOf(w); return i >= 0 ? i : Infinity; }));

            return homeIdx < awayIdx ? makeResult(s1, s2) : makeResult(s2, s1);
        }
    }

    // ── Strategy C: Direct "TeamA X-Y TeamB" pattern ──
    for (const [t1, t2, isReversed] of [[homeLower, awayLower, false], [awayLower, homeLower, true],
    [homeNorm, awayNorm, false], [awayNorm, homeNorm, true]]) {
        const pat = new RegExp(`${escapeRegex(t1)}[^\\d]{0,25}(\\d{1,3})\\s*[-–:]\\s*(\\d{1,3})[^\\d]{0,25}${escapeRegex(t2)}`, 'i');
        const m = cleanText.match(pat);
        if (m) {
            const s1 = parseInt(m[1]), s2 = parseInt(m[2]);
            if (!isSane(s1, s2)) continue;
            return isReversed ? makeResult(s2, s1) : makeResult(s1, s2);
        }
    }

    // ── Strategy D: Tennis-specific "6-4, 6-2" pattern near player names ──
    if (sportType === 'tennis') {
        const tennisScoreRegex = /(\d)-(\d)\s*,\s*(\d)-(\d)(?:\s*,\s*(\d)-(\d))?/g;
        let tennisMatch;
        while ((tennisMatch = tennisScoreRegex.exec(cleanText)) !== null) {
            const context = cleanText.substring(
                Math.max(0, tennisMatch.index - 150),
                Math.min(cleanText.length, tennisMatch.index + tennisMatch[0].length + 150)
            );

            const hasHome = homeWords.some(w => context.includes(w));
            const hasAway = awayWords.some(w => context.includes(w));
            if (!hasHome || !hasAway) continue;

            // Count sets won by "first" player (listed first in score)
            let firstSets = 0, secondSets = 0;
            const sets = [[parseInt(tennisMatch[1]), parseInt(tennisMatch[2])],
            [parseInt(tennisMatch[3]), parseInt(tennisMatch[4])]];
            if (tennisMatch[5] && tennisMatch[6]) {
                sets.push([parseInt(tennisMatch[5]), parseInt(tennisMatch[6])]);
            }
            for (const [a, b] of sets) {
                if (a > b) firstSets++;
                else if (b > a) secondSets++;
            }

            // Determine which player won based on win verb proximity
            const wonVerbs = winVerbs.some(v => context.includes(v));
            const homeIdx = Math.min(...homeWords.map(w => { const i = context.indexOf(w); return i >= 0 ? i : Infinity; }));
            const awayIdx = Math.min(...awayWords.map(w => { const i = context.indexOf(w); return i >= 0 ? i : Infinity; }));

            if (homeIdx < awayIdx) {
                return makeResult(firstSets, secondSets);
            } else {
                return makeResult(secondSets, firstSets);
            }
        }
    }

    // ── Strategy E: Generic "X-Y" proximity search (last resort) ──
    const genericScoreRegex = /(\d{1,3})\s*[-–:]\s*(\d{1,3})/g;
    let genericMatch;
    while ((genericMatch = genericScoreRegex.exec(cleanText)) !== null) {
        const context = cleanText.substring(
            Math.max(0, genericMatch.index - 100),
            Math.min(cleanText.length, genericMatch.index + genericMatch[0].length + 100)
        );

        const hasHome = homeWords.some(w => context.includes(w));
        const hasAway = awayWords.some(w => context.includes(w));
        if (!hasHome || !hasAway) continue;

        const s1 = parseInt(genericMatch[1]), s2 = parseInt(genericMatch[2]);
        if (!isSane(s1, s2)) continue;
        // Skip likely year numbers or irrelevant
        if (s1 > 10 && s2 > 10 && sportType !== 'basketball') continue;

        const homeIdx = Math.min(...homeWords.map(w => { const i = context.indexOf(w); return i >= 0 ? i : Infinity; }));
        const awayIdx = Math.min(...awayWords.map(w => { const i = context.indexOf(w); return i >= 0 ? i : Infinity; }));

        return homeIdx < awayIdx ? makeResult(s1, s2) : makeResult(s2, s1);
    }

    return null;
};

/** Escape special regex characters */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ═══════════════════════════════════════════════════════════════
// 🔌 API Provider 5: SofaScore Search API
// ═══════════════════════════════════════════════════════════════
const searchSofaScore = async (teams, betDate) => {
    const searchQueries = [
        `${teams.homeRaw} ${teams.awayRaw}`,
        `${teams.home} ${teams.away}`,
        teams.homeRaw,
    ];

    for (const query of searchQueries) {
        try {
            const response = await axios.get('https://api.sofascore.com/api/v1/search/events', {
                params: { q: query, page: 0 },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Accept': 'application/json'
                },
                timeout: 8000
            });

            if (!response.data?.events?.length) continue;

            const betDateObj = betDate ? new Date(betDate) : null;

            for (const event of response.data.events) {
                const sofaHome = (event.homeTeam?.name || event.homeTeam?.shortName || '').toLowerCase();
                const sofaAway = (event.awayTeam?.name || event.awayTeam?.shortName || '').toLowerCase();

                const matchesForward = fuzzyMatch(sofaHome, teams.home) && fuzzyMatch(sofaAway, teams.away);
                const matchesReverse = fuzzyMatch(sofaHome, teams.away) && fuzzyMatch(sofaAway, teams.home);

                if (!matchesForward && !matchesReverse) continue;

                const homeScore = event.homeScore?.current;
                const awayScore = event.awayScore?.current;
                if (homeScore === undefined || awayScore === undefined) continue;
                if (event.status?.type !== 'finished') continue;

                // Date proximity check
                if (betDateObj && event.startTimestamp) {
                    const eventDate = new Date(event.startTimestamp * 1000);
                    const diffDays = Math.abs(eventDate.getTime() - betDateObj.getTime()) / (1000 * 60 * 60 * 24);
                    if (diffDays > 3) continue;
                }

                if (matchesReverse) {
                    return {
                        score: `${awayScore}-${homeScore}`,
                        homeScore: awayScore, awayScore: homeScore,
                        homeTeam: event.awayTeam?.name || teams.homeRaw,
                        awayTeam: event.homeTeam?.name || teams.awayRaw,
                        date: event.startTimestamp ? new Date(event.startTimestamp * 1000).toISOString() : betDate,
                        sport: event.tournament?.category?.sport?.name || 'Unknown',
                        league: event.tournament?.name || 'Unknown',
                        source: 'SofaScore'
                    };
                }

                return {
                    score: `${homeScore}-${awayScore}`,
                    homeScore: parseInt(homeScore), awayScore: parseInt(awayScore),
                    homeTeam: event.homeTeam?.name || teams.homeRaw,
                    awayTeam: event.awayTeam?.name || teams.awayRaw,
                    date: event.startTimestamp ? new Date(event.startTimestamp * 1000).toISOString() : betDate,
                    sport: event.tournament?.category?.sport?.name || 'Unknown',
                    league: event.tournament?.name || 'Unknown',
                    source: 'SofaScore'
                };
            }
        } catch (e) {
            // SofaScore might block, continue
        }
    }
    return null;
};

/**
 * Generate alternative search name variants for retry attempts
 * Her retry'da farklı bir varyasyon dene
 */
const getSearchVariants = (matchStr, retryCount) => {
    const teams = parseMatchTeams(matchStr);
    if (!teams) return [matchStr];

    const variants = [
        matchStr,                                    // Original
        `${teams.home} VS ${teams.away}`,           // Normalized names
        `${teams.away} VS ${teams.home}`,           // Reversed order
        `${teams.homeRaw} VS ${teams.away}`,        // Mixed
        `${teams.home} VS ${teams.awayRaw}`,        // Mixed reverse
    ];

    // On higher retry counts, try shorter names
    if (retryCount >= 2) {
        const homeShort = teams.homeRaw.split(/\s+/)[0];
        const awayShort = teams.awayRaw.split(/\s+/)[0];
        variants.push(`${homeShort} VS ${awayShort}`);
    }

    // On even higher retries, try without "VS"
    if (retryCount >= 3) {
        variants.push(`${teams.homeRaw} ${teams.awayRaw}`);
        variants.push(`${teams.home} ${teams.away}`);
    }

    return variants;
};

// ═══════════════════════════════════════════════════════════════
// 🔧 Helper: Find best matching event from API results
// ═══════════════════════════════════════════════════════════════
const findBestMatch = (events, teams, betDate, mapFn, filterFn) => {
    const betDateObj = betDate ? new Date(betDate) : null;

    // Filter completed events
    const completed = events.filter(filterFn);
    if (completed.length === 0) return null;

    // Filter events that match the teams
    const matching = completed.filter(e => {
        const home = (e.strHomeTeam || '').toLowerCase();
        const away = (e.strAwayTeam || '').toLowerCase();
        const teamHome = teams.home.toLowerCase();
        const teamAway = teams.away.toLowerCase();

        return (
            (fuzzyMatch(home, teamHome) && fuzzyMatch(away, teamAway)) ||
            (fuzzyMatch(home, teamAway) && fuzzyMatch(away, teamHome))
        );
    });

    if (matching.length === 0) return null;

    // Find the closest date match
    let best = matching[0];
    if (betDateObj && matching.length > 1) {
        let smallestDiff = Infinity;
        for (const event of matching) {
            const eventDate = new Date(event.dateEvent || event.date);
            const diff = Math.abs(eventDate.getTime() - betDateObj.getTime());
            if (diff < smallestDiff) {
                smallestDiff = diff;
                best = event;
            }
        }
    }

    const result = mapFn(best);

    // Check if teams are reversed (our "home" is actually "away" in API)
    const apiHome = (best.strHomeTeam || '').toLowerCase();
    const ourHome = teams.home.toLowerCase();
    if (!fuzzyMatch(apiHome, ourHome) && fuzzyMatch(apiHome, teams.away.toLowerCase())) {
        // Swap scores to match our team order
        return {
            ...result,
            score: `${result.awayScore}-${result.homeScore}`,
            homeScore: result.awayScore,
            awayScore: result.homeScore,
        };
    }

    return result;
};

// ═══════════════════════════════════════════════════════════════
// 🎯 Main Search: Multi-source waterfall with caching (v3.0)
// 5 aşamalı arama: TheSportsDB → ESPN → Team History → SofaScore → Web Search
// ═══════════════════════════════════════════════════════════════
const searchMatchResult = async (matchStr, betDate, sportType, retryCount = 0) => {
    // Check cache first
    const cacheKey = `${matchStr}_${betDate || 'no-date'}`;
    if (resultCache.has(cacheKey)) {
        return resultCache.get(cacheKey);
    }

    const teams = parseMatchTeams(matchStr);
    if (!teams) return null;

    let result = null;

    // On retries, try with alternative name variants
    const searchVariants = retryCount > 0 ? getSearchVariants(matchStr, retryCount) : [matchStr];

    for (const variant of searchVariants) {
        const variantTeams = parseMatchTeams(variant);
        if (!variantTeams) continue;

        // ── Strategy 1: TheSportsDB Event Search (fastest, most reliable) ──
        try {
            result = await searchTheSportsDB(variantTeams, betDate);
            if (result) {
                resultCache.set(cacheKey, result);
                return result;
            }
        } catch (e) { /* continue */ }

        // ── Strategy 2: ESPN Scoreboard (by date + league) ──
        try {
            result = await searchESPN(variantTeams, betDate, sportType);
            if (result) {
                resultCache.set(cacheKey, result);
                return result;
            }
        } catch (e) { /* continue */ }

        // ── Strategy 3: TheSportsDB Team History ──
        try {
            result = await searchTheSportsDBByTeam(variantTeams, betDate);
            if (result) {
                resultCache.set(cacheKey, result);
                return result;
            }
        } catch (e) { /* continue */ }

        // Only try expensive searches for the first variant to avoid too many requests
        if (variant === searchVariants[0]) {
            // ── Strategy 4: SofaScore Search API ──
            try {
                result = await searchSofaScore(variantTeams, betDate);
                if (result) {
                    resultCache.set(cacheKey, result);
                    return result;
                }
            } catch (e) { /* continue */ }

            // ── Strategy 5: Web Search (DuckDuckGo - son çare) ──
            try {
                result = await searchWebFallback(variantTeams, betDate, sportType);
                if (result) {
                    resultCache.set(cacheKey, result);
                    return result;
                }
            } catch (e) { /* continue */ }
        }
    }

    // All sources exhausted
    resultCache.set(cacheKey, null); // Cache negative result too
    return null;
};

// ═══════════════════════════════════════════════════════════════
// 🧠 Bet Status Determination
// ═══════════════════════════════════════════════════════════════
const determineBetStatus = (bet, result) => {
    const selection = (bet.selection || '').toLowerCase();
    const homeScore = result.homeScore;
    const awayScore = result.awayScore;
    const totalGoals = homeScore + awayScore;

    const teams = parseMatchTeams(bet.match);
    if (!teams) return null;

    // ── 1. Over/Under ──
    const overMatch = selection.match(/over\s*(\d+\.?\d*)/);
    const underMatch = selection.match(/under\s*(\d+\.?\d*)/);

    if (overMatch || underMatch) {
        const line = parseFloat((overMatch || underMatch)[1]);

        // CRITICAL: Check if the over/under refers to a SPECIFIC TEAM's total
        // e.g., "Slovakia Total Over 1.5" → use Slovakia's goals only
        // vs. "Total Over 2.5" → use combined match total
        const homeTeamClean = teams.homeRaw.toLowerCase()
            .replace(/[\u{1F1E0}-\u{1F1FF}\u{1F3F4}\u{E0061}-\u{E007A}\u{E007F}]/gu, '').trim();
        const awayTeamClean = teams.awayRaw.toLowerCase()
            .replace(/[\u{1F1E0}-\u{1F1FF}\u{1F3F4}\u{E0061}-\u{E007A}\u{E007F}]/gu, '').trim();

        let relevantScore = totalGoals; // Default: match total

        // Check if selection mentions a specific team before "total/over/under"
        const homeInSelection = isTeamInSelection(selection, homeTeamClean);
        const awayInSelection = isTeamInSelection(selection, awayTeamClean);

        if (homeInSelection && !awayInSelection) {
            // Team-specific: use home team's goals only
            relevantScore = homeScore;
        } else if (awayInSelection && !homeInSelection) {
            // Team-specific: use away team's goals only
            relevantScore = awayScore;
        }
        // If both or neither team mentioned → use match total (default)

        if (overMatch) {
            if (relevantScore === line) return 'void';
            return relevantScore > line ? 'won' : 'lost';
        }
        if (underMatch) {
            if (relevantScore === line) return 'void';
            return relevantScore < line ? 'won' : 'lost';
        }
    }

    // ── 2. Both Teams to Score (BTTS) ──
    if (selection.includes('both teams to score') || selection.includes('btts')) {
        const bothScored = homeScore > 0 && awayScore > 0;
        if (selection.includes('yes')) return bothScored ? 'won' : 'lost';
        if (selection.includes('no')) return !bothScored ? 'won' : 'lost';
        return bothScored ? 'won' : 'lost';
    }

    // ── 3. Draw ──
    if (selection.includes('draw')) {
        return homeScore === awayScore ? 'won' : 'lost';
    }

    // ── 4. Total Goals Exact ──
    const totalExact = selection.match(/total.*?(\d+)\s*goals?/i);
    if (totalExact) {
        return totalGoals === parseInt(totalExact[1]) ? 'won' : 'lost';
    }

    // ── 5. Winner / Full-Time Result ──
    const homeTeamLower = teams.homeRaw.toLowerCase()
        .replace(/[\u{1F1E0}-\u{1F1FF}\u{1F3F4}\u{E0061}-\u{E007A}\u{E007F}]/gu, '').trim();
    const awayTeamLower = teams.awayRaw.toLowerCase()
        .replace(/[\u{1F1E0}-\u{1F1FF}\u{1F3F4}\u{E0061}-\u{E007A}\u{E007F}]/gu, '').trim();

    // Handicap check
    const handicapMatch = selection.match(/handicap.*?([+-]?\d+\.?\d*)/i);
    if (handicapMatch) {
        const handicapValue = parseFloat(handicapMatch[1]);
        // Determine which team the handicap applies to
        if (isTeamInSelection(selection, homeTeamLower)) {
            const adjustedHome = homeScore + handicapValue;
            if (adjustedHome === awayScore) return 'void';
            return adjustedHome > awayScore ? 'won' : 'lost';
        }
        if (isTeamInSelection(selection, awayTeamLower)) {
            const adjustedAway = awayScore + handicapValue;
            if (adjustedAway === homeScore) return 'void';
            return adjustedAway > homeScore ? 'won' : 'lost';
        }
    }

    // Winner keywords
    const winKeywords = ['win', 'winner', 'full time result', '1x2',
        'to qualify', 'match result', 'to advance', 'moneyline'];

    if (winKeywords.some(kw => selection.includes(kw))) {
        if (isTeamInSelection(selection, homeTeamLower)) {
            return homeScore > awayScore ? 'won' : 'lost';
        }
        if (isTeamInSelection(selection, awayTeamLower)) {
            return awayScore > homeScore ? 'won' : 'lost';
        }
    }

    // ── 6. Simple team name match ──
    const homeFound = isTeamInSelection(selection, homeTeamLower);
    const awayFound = isTeamInSelection(selection, awayTeamLower);

    if (homeFound && !awayFound) {
        return homeScore > awayScore ? 'won' : 'lost';
    }
    if (awayFound && !homeFound) {
        return awayScore > homeScore ? 'won' : 'lost';
    }

    return null;
};

/**
 * Check if a team name is referenced in the selection text
 */
const isTeamInSelection = (selection, teamName) => {
    if (!teamName || teamName.length < 2) return false;
    // Direct substring check
    if (selection.includes(teamName)) return true;
    // Word-level matching
    const words = teamName.split(/\s+/).filter(w => w.length > 2);
    return words.some(word => selection.includes(word.toLowerCase()));
};

// ═══════════════════════════════════════════════════════════════
// 🚀 Main Export: Check and Resolve Results
// ═══════════════════════════════════════════════════════════════
export const checkAndResolveResults = async (db) => {
    console.log('\n🔍 Starting Automatic Result Check (Multi-Source v3.0)...');
    console.log('📡 Sources: TheSportsDB → ESPN → Team History → SofaScore → Web Search\n');

    // Clear stale cache from previous runs (prevents negative result poisoning)
    resultCache.clear();

    // 1. Fetch all pending bets
    const snapshot = await db.collection('bets').where('status', '==', 'pending').get();

    if (snapshot.empty) {
        console.log('✅ No pending bets to resolve.');
        return { checked: 0, resolved: 0, failed: 0 };
    }

    const now = new Date();
    const pendingBets = [];
    snapshot.forEach(doc => pendingBets.push({ id: doc.id, ref: doc.ref, ...doc.data() }));

    // 2. Filter: Only check bets where the match has likely ended
    //    AND respect retry limits
    const eligibleBets = pendingBets.filter(bet => {
        const betDate = bet.timestamp ? new Date(bet.timestamp) : null;
        if (!betDate) return true;
        if (betDate > now) return false;
        const hoursSince = (now.getTime() - betDate.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 3) return false;

        // Skip if we've exceeded max retries
        const retryCount = bet.retryCount || 0;
        if (retryCount >= MAX_RETRIES) return false;

        return true;
    });

    const skipped = pendingBets.length - eligibleBets.length;
    const maxedOut = pendingBets.filter(b => (b.retryCount || 0) >= MAX_RETRIES).length;

    console.log(`📋 Found ${pendingBets.length} pending bets`);
    console.log(`   ✅ Eligible: ${eligibleBets.length}`);
    console.log(`   ⏭️  Skipped (future/recent): ${skipped - maxedOut}`);
    if (maxedOut > 0) console.log(`   🛑 Max retries reached: ${maxedOut}`);

    if (eligibleBets.length === 0) {
        console.log('\n✅ No eligible bets to check.');
        return { checked: 0, resolved: 0, failed: 0, skipped };
    }

    // 3. Group bets by match name (dedup API calls)
    const matchGroups = new Map();
    for (const bet of eligibleBets) {
        const key = bet.match;
        if (!matchGroups.has(key)) {
            matchGroups.set(key, []);
        }
        matchGroups.get(key).push(bet);
    }

    console.log(`\n🔎 ${matchGroups.size} unique matches to check...\n`);

    // 4. Process each unique match
    let resolved = 0;
    let failed = 0;
    let checked = 0;
    let scoreOnly = 0;
    const batchUpdates = [];

    // Process in batches of 3 concurrent API calls for speed
    const matchEntries = [...matchGroups.entries()];
    const CONCURRENT_BATCH = 3;

    for (let i = 0; i < matchEntries.length; i += CONCURRENT_BATCH) {
        const batch = matchEntries.slice(i, i + CONCURRENT_BATCH);

        await Promise.allSettled(
            batch.map(async ([matchName, bets]) => {
                checked++;
                const sportType = detectSport(bets[0]);
                const retryCount = bets[0].retryCount || 0;

                // Pass retryCount to searchMatchResult for variant strategies
                const result = await searchMatchResult(matchName, bets[0].timestamp, sportType, retryCount);

                if (!result) {
                    failed++;
                    const newRetry = retryCount + 1;
                    const emoji = newRetry >= MAX_RETRIES ? '🛑' : '⚠️';
                    console.log(`  ${emoji} [${sportType.toUpperCase()}] No result: ${matchName} (retry ${newRetry}/${MAX_RETRIES})`);

                    // Update retry count in Firestore
                    for (const bet of bets) {
                        batchUpdates.push({
                            ref: bet.ref,
                            data: {
                                retryCount: newRetry,
                                lastRetry: now.toISOString(),
                                lastRetryStrategy: `v3_retry_${newRetry}`
                            }
                        });
                    }
                    return;
                }

                // Process all bets for this match
                for (const bet of bets) {
                    const status = determineBetStatus(bet, result);

                    if (status) {
                        batchUpdates.push({
                            ref: bet.ref,
                            data: {
                                status,
                                score: result.score,
                                lastVerified: now.toISOString(),
                                resultSource: `auto_${result.source}`,
                                retryCount: (bet.retryCount || 0) // Keep the count for stats
                            }
                        });
                        resolved++;
                        const retryNote = retryCount > 0 ? ` (found on retry #${retryCount})` : '';
                        console.log(`  ✅ [${result.source}] ${matchName}: ${result.score} → ${status.toUpperCase()}${retryNote}`);
                    } else {
                        batchUpdates.push({
                            ref: bet.ref,
                            data: {
                                score: result.score,
                                lastVerified: now.toISOString(),
                                resultSource: `auto_${result.source}_score_only`,
                                retryCount: (bet.retryCount || 0)
                            }
                        });
                        scoreOnly++;
                        console.log(`  📊 [${result.source}] ${matchName}: ${result.score} (status unclear: "${bet.selection}")`);
                    }
                }
            })
        );

        // Delay between concurrent batches
        if (i + CONCURRENT_BATCH < matchEntries.length) {
            await new Promise(r => setTimeout(r, 800));
        }
    }

    // 5. Commit all updates in Firestore batches (max 500 per batch)
    if (batchUpdates.length > 0) {
        const FIRESTORE_BATCH_LIMIT = 500;
        for (let i = 0; i < batchUpdates.length; i += FIRESTORE_BATCH_LIMIT) {
            const chunk = batchUpdates.slice(i, i + FIRESTORE_BATCH_LIMIT);
            const firestoreBatch = db.batch();
            chunk.forEach(u => firestoreBatch.update(u.ref, u.data));
            await firestoreBatch.commit();
        }
        console.log(`\n💾 Committed ${batchUpdates.length} updates to Firestore.`);
    }

    // 6. Summary
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`📊 Result Check Complete (v3.0 - Multi-Source):`);
    console.log(`   ✅ Resolved (WIN/LOSS/VOID): ${resolved}`);
    console.log(`   📊 Score only (status unclear): ${scoreOnly}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ⚠️  No result (will retry): ${failed}`);
    console.log(`   🔎 Unique matches checked: ${checked}`);
    console.log(`   📡 Sources: TheSportsDB, ESPN, SofaScore, WebSearch`);
    console.log(`${'═'.repeat(55)}\n`);

    return { checked, resolved, failed, skipped, scoreOnly };
};
