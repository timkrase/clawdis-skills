#!/usr/bin/env node
/**
 * Football Skill - European football matches
 * Usage: football.js <command> [options]
 */

const https = require('https');
const http = require('http');

// Top teams for "interesting" filter
const TOP_TEAMS = [
  // Germany
  'bayern', 'münchen', 'dortmund', 'bvb', 'leverkusen', 'leipzig',
  // England
  'manchester', 'liverpool', 'arsenal', 'chelsea', 'tottenham', 'city',
  // Spain
  'real madrid', 'barcelona', 'atlético', 'atletico',
  // Italy
  'juventus', 'inter', 'milan', 'napoli', 'roma',
  // France
  'paris', 'psg', 'marseille', 'lyon',
];

// League mappings
const LEAGUES = {
  'bundesliga': { api: 'openliga', code: 'bl1' },
  'bl1': { api: 'openliga', code: 'bl1' },
  'bundesliga2': { api: 'openliga', code: 'bl2' },
  'bl2': { api: 'openliga', code: 'bl2' },
  'dfb': { api: 'openliga', code: 'dfbpokal' },
  'premier-league': { api: 'footballdata', code: 'PL' },
  'pl': { api: 'footballdata', code: 'PL' },
  'la-liga': { api: 'footballdata', code: 'PD' },
  'pd': { api: 'footballdata', code: 'PD' },
  'serie-a': { api: 'footballdata', code: 'SA' },
  'sa': { api: 'footballdata', code: 'SA' },
  'ligue-1': { api: 'footballdata', code: 'FL1' },
  'fl1': { api: 'footballdata', code: 'FL1' },
  'champions-league': { api: 'footballdata', code: 'CL' },
  'cl': { api: 'footballdata', code: 'CL' },
  'europa-league': { api: 'footballdata', code: 'EL' },
  'el': { api: 'footballdata', code: 'EL' },
};

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';

function fetch(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function isTopTeam(teamName) {
  const lower = teamName.toLowerCase();
  return TOP_TEAMS.some(t => lower.includes(t));
}

function isInteresting(match) {
  return isTopTeam(match.homeTeam) || isTopTeam(match.awayTeam);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatTime(date) {
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

// OpenLigaDB (German leagues)
async function fetchOpenLiga(leagueCode, season = null) {
  // Season is the starting year (e.g., 2025 for 2025/2026 season)
  // If we're in Jan-Jul, use previous year as season start
  if (!season) {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    season = month < 7 ? year - 1 : year;
  }
  
  const url = `https://api.openligadb.de/getmatchdata/${leagueCode}/${season}`;
  const data = await fetch(url);
  
  if (!Array.isArray(data)) {
    console.error('OpenLigaDB returned unexpected data:', data);
    return [];
  }
  
  return data.map(m => ({
    id: m.matchID,
    competition: m.leagueName || leagueCode,
    homeTeam: m.team1?.teamName || 'TBD',
    awayTeam: m.team2?.teamName || 'TBD',
    date: new Date(m.matchDateTimeUTC || m.matchDateTime),
    status: m.matchIsFinished ? 'FINISHED' : 'SCHEDULED',
    homeScore: m.matchResults?.[1]?.pointsTeam1 ?? null,
    awayScore: m.matchResults?.[1]?.pointsTeam2 ?? null,
  }));
}

// football-data.org
async function fetchFootballData(competitionCode, dateFrom, dateTo) {
  if (!FOOTBALL_DATA_API_KEY) {
    console.error(`Warning: FOOTBALL_DATA_API_KEY not set. Cannot fetch ${competitionCode}.`);
    return [];
  }
  
  let url = `https://api.football-data.org/v4/competitions/${competitionCode}/matches`;
  if (dateFrom && dateTo) {
    url += `?dateFrom=${dateFrom}&dateTo=${dateTo}`;
  }
  
  const data = await fetch(url, { 'X-Auth-Token': FOOTBALL_DATA_API_KEY });
  
  if (data.error || data.message) {
    console.error(`API Error: ${data.message || data.error}`);
    return [];
  }
  
  return (data.matches || []).map(m => ({
    id: m.id,
    competition: m.competition?.name || competitionCode,
    homeTeam: m.homeTeam?.name || 'TBD',
    awayTeam: m.awayTeam?.name || 'TBD',
    date: new Date(m.utcDate),
    status: m.status,
    homeScore: m.score?.fullTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? null,
  }));
}

async function getMatches(leagueCodes, dateFrom, dateTo) {
  const allMatches = [];
  
  for (const code of leagueCodes) {
    const league = LEAGUES[code.toLowerCase()];
    if (!league) {
      console.error(`Unknown league: ${code}`);
      continue;
    }
    
    try {
      let matches;
      if (league.api === 'openliga') {
        matches = await fetchOpenLiga(league.code);
        // Filter by date
        if (dateFrom || dateTo) {
          const from = dateFrom ? new Date(dateFrom) : new Date(0);
          const to = dateTo ? new Date(dateTo) : new Date('2100-01-01');
          matches = matches.filter(m => m.date >= from && m.date <= to);
        }
      } else {
        matches = await fetchFootballData(league.code, dateFrom, dateTo);
      }
      allMatches.push(...matches);
    } catch (e) {
      console.error(`Error fetching ${code}: ${e.message}`);
    }
  }
  
  return allMatches.sort((a, b) => a.date - b.date);
}

function formatMatch(m, options = {}) {
  const dateStr = formatDate(m.date);
  const timeStr = formatTime(m.date);
  const score = m.status === 'FINISHED' ? `${m.homeScore}:${m.awayScore}` : 'vs';
  
  if (options.human) {
    const interesting = isInteresting(m) ? '🔥' : '';
    return `${interesting} ${dateStr} ${timeStr} | ${m.homeTeam} ${score} ${m.awayTeam} (${m.competition})`;
  }
  
  return m;
}

// Commands
async function upcoming(options) {
  const today = new Date();
  const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const leagues = options.league 
    ? [options.league] 
    : ['bundesliga', 'champions-league', 'premier-league'];
  
  const matches = await getMatches(leagues, formatDate(today), formatDate(weekLater));
  const scheduled = matches.filter(m => m.status !== 'FINISHED');
  
  if (options.human) {
    console.log(`\n⚽ Upcoming matches (${formatDate(today)} - ${formatDate(weekLater)}):\n`);
    scheduled.forEach(m => console.log(formatMatch(m, { human: true })));
  } else {
    console.log(JSON.stringify(scheduled, null, 2));
  }
}

async function today(options) {
  const todayStr = formatDate(new Date());
  
  const leagues = options.league 
    ? [options.league] 
    : ['bundesliga', 'champions-league', 'premier-league'];
  
  const matches = await getMatches(leagues, todayStr, todayStr);
  
  if (options.human) {
    console.log(`\n⚽ Today's matches (${todayStr}):\n`);
    if (matches.length === 0) {
      console.log('No matches today.');
    } else {
      matches.forEach(m => console.log(formatMatch(m, { human: true })));
    }
  } else {
    console.log(JSON.stringify(matches, null, 2));
  }
}

async function highlights(options) {
  const today = new Date();
  const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const leagues = ['bundesliga', 'champions-league', 'premier-league', 'la-liga'];
  const matches = await getMatches(leagues, formatDate(today), formatDate(weekLater));
  const interesting = matches.filter(m => isInteresting(m) && m.status !== 'FINISHED');
  
  if (options.human) {
    console.log(`\n🔥 Interesting matches this week:\n`);
    if (interesting.length === 0) {
      console.log('No top matches found.');
    } else {
      interesting.forEach(m => console.log(formatMatch(m, { human: true })));
    }
  } else {
    console.log(JSON.stringify(interesting, null, 2));
  }
}

async function results(options) {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const leagues = options.league 
    ? [options.league] 
    : ['bundesliga', 'champions-league'];
  
  const matches = await getMatches(leagues, formatDate(weekAgo), formatDate(today));
  const finished = matches.filter(m => m.status === 'FINISHED');
  
  if (options.human) {
    console.log(`\n⚽ Recent results:\n`);
    finished.forEach(m => console.log(formatMatch(m, { human: true })));
  } else {
    console.log(JSON.stringify(finished, null, 2));
  }
}

async function briefing(options) {
  const today = new Date();
  const todayStr = formatDate(today);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const leagues = ['bundesliga', 'champions-league', 'premier-league'];
  
  console.log('⚽ **Football Briefing**\n');
  
  // Today's matches
  const todayMatches = await getMatches(leagues, todayStr, todayStr);
  const todayInteresting = todayMatches.filter(m => isInteresting(m));
  
  if (todayInteresting.length > 0) {
    console.log('📅 **Today:**');
    todayInteresting.forEach(m => {
      const time = formatTime(m.date);
      console.log(`  • ${time} ${m.homeTeam} vs ${m.awayTeam}`);
    });
    console.log('');
  }
  
  // This week's highlights
  const weekMatches = await getMatches(leagues, todayStr, formatDate(weekLater));
  const weekHighlights = weekMatches.filter(m => isInteresting(m) && m.status !== 'FINISHED');
  
  if (weekHighlights.length > 0) {
    console.log('🔥 **This week\'s highlights:**');
    weekHighlights.slice(0, 5).forEach(m => {
      const date = formatDate(m.date);
      const time = formatTime(m.date);
      console.log(`  • ${date} ${time} ${m.homeTeam} vs ${m.awayTeam}`);
    });
  } else {
    console.log('No major matches this week.');
  }
}

// Parse args
const args = process.argv.slice(2);
const command = args[0] || 'upcoming';
const options = {
  human: args.includes('--human'),
  compact: args.includes('--compact'),
  league: null,
};

const leagueIdx = args.indexOf('--league');
if (leagueIdx !== -1 && args[leagueIdx + 1]) {
  options.league = args[leagueIdx + 1];
}

(async () => {
  try {
    switch (command) {
      case 'upcoming':
        await upcoming(options);
        break;
      case 'today':
        await today(options);
        break;
      case 'highlights':
        await highlights(options);
        break;
      case 'results':
        await results(options);
        break;
      case 'briefing':
        await briefing(options);
        break;
      case 'help':
      default:
        console.log(`
Football Skill ⚽

Commands:
  upcoming     Upcoming matches (next 7 days)
  today        Today's matches
  highlights   Interesting matches (top teams)
  results      Recent results
  briefing     Morning briefing summary

Options:
  --league <code>   Filter by league (bundesliga, premier-league, etc.)
  --human           Human-readable output

Examples:
  football.js upcoming --human
  football.js today --league bundesliga
  football.js highlights
  football.js briefing
`);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
})();
