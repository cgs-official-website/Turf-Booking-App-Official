// src/utils/matchStorage.js
//
// Local-only persistence for the Match/Team/Toss/Scorecard feature.
// No backend calls — everything lives in AsyncStorage on-device.

import AsyncStorage from '@react-native-async-storage/async-storage';

const MATCHES_KEY = '@turf_matches';
const RECENT_PLAYERS_KEY = '@turf_recent_players';

const genId = (prefix = 'm') =>
  `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

async function readJSON(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

async function writeJSON(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// ── Matches ──────────────────────────────────────────────────────────────
export const matchStorage = {
  genId,

  async getAllMatches() {
    const all = await readJSON(MATCHES_KEY, {});
    return Object.values(all).sort((a, b) => b.createdAt - a.createdAt);
  },

  async getMatch(id) {
    const all = await readJSON(MATCHES_KEY, {});
    return all[id] || null;
  },

  async saveMatch(match) {
    const all = await readJSON(MATCHES_KEY, {});
    all[match.id] = match;
    await writeJSON(MATCHES_KEY, all);
    return match;
  },

  async deleteMatch(id) {
    const all = await readJSON(MATCHES_KEY, {});
    delete all[id];
    await writeJSON(MATCHES_KEY, all);
  },

  async createMatch(data = {}) {
    const id = genId('match');
    const match = {
      id,
      status: 'draft', // draft -> upcoming -> toss -> live -> completed
      createdAt: Date.now(),
      place: data.place || '',
      sport: data.sport || 'Cricket',
      date: data.date || 'Today',
      time: data.time || '',
      overs: 6,
      playWithStrangers: false,
      players: [], // [{id,name,phone,isGuest}]
      teams: {
        A: { name: 'Team A', logo: null, playerIds: [], captainId: null },
        B: { name: 'Team B', logo: null, playerIds: [], captainId: null },
      },
      toss: null, // {spinTeam, callTeam, call, result, wonBy, decision}
      currentInningsIndex: 0,
      innings: [],
      timeline: [{ time: Date.now(), text: 'Match created' }],
      ...data,
    };
    await this.saveMatch(match);
    return match;
  },

  async updateMatch(id, patch) {
    const match = await this.getMatch(id);
    if (!match) return null;
    const updated = { ...match, ...patch };
    await this.saveMatch(updated);
    return updated;
  },

  async addTimeline(id, text) {
    const match = await this.getMatch(id);
    if (!match) return null;
    match.timeline = [...(match.timeline || []), { time: Date.now(), text }];
    await this.saveMatch(match);
    return match;
  },
};

// ── Recent / guest players (so "Select Players" has something to show) ────
export const playerStorage = {
  async getRecentPlayers() {
    const list = await readJSON(RECENT_PLAYERS_KEY, null);
    if (list && list.length) return list;
    // seed with a friendly default list the first time
    const seed = [
      { id: 'p_you', name: 'You', phone: '', isGuest: false },
      { id: genId('p'), name: 'Arun Kumar', phone: '', isGuest: false },
      { id: genId('p'), name: 'Balaji', phone: '', isGuest: false },
      { id: genId('p'), name: 'Balu', phone: '', isGuest: false },
      { id: genId('p'), name: 'Charan', phone: '', isGuest: false },
      { id: genId('p'), name: 'Dinesh', phone: '', isGuest: false },
      { id: genId('p'), name: 'Ghajini', phone: '', isGuest: false },
    ];
    await writeJSON(RECENT_PLAYERS_KEY, seed);
    return seed;
  },

  async addGuestPlayer({ name, phone }) {
    const list = await this.getRecentPlayers();
    const player = { id: genId('guest'), name, phone: phone || '', isGuest: true };
    const updated = [...list, player];
    await writeJSON(RECENT_PLAYERS_KEY, updated);
    return player;
  },
};