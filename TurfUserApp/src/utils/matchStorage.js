// src/utils/matchStorage.js
// Offline-first Match/Team/Toss/Scorecard engine with real-time cloud sync.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { client } from '../api/client';

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

export const matchStorage = {
  genId,

  async getAllMatches() {
    const all = await readJSON(MATCHES_KEY, {});
    return Object.values(all).sort((a, b) => b.createdAt - a.createdAt);
  },

  async getMatch(id) {
    // 1. Read local copy first (instant)
    const all = await readJSON(MATCHES_KEY, {});
    const local = all[id] || null;

    // 2. Fetch latest live match state from backend if online
    try {
      const serverRes = await client.get(`/matches/${id}`);
      if (serverRes?.match) {
        const merged = { ...local, ...serverRes.match, id };
        all[id] = merged;
        await writeJSON(MATCHES_KEY, all);
        return merged;
      }
    } catch {
      // Offline fallback: return local copy
    }

    return local;
  },

  async saveMatch(match) {
    if (!match || !match.id) return match;

    // 1. Save locally immediately for offline-first zero-latency scoring
    const all = await readJSON(MATCHES_KEY, {});
    all[match.id] = match;
    await writeJSON(MATCHES_KEY, all);

    // 2. Sync to cloud backend in background for real-time live viewers
    (async () => {
      try {
        await client.patch(`/matches/${match.id}/scorecard`, {
          scorecard: match.scorecard || match.innings || {},
          status: match.status || 'live',
        });
      } catch (err) {
        // Offline / sync queued
      }
    })();

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
      time: data.time || '07:00 PM',
      playWithStrangers: !!data.playWithStrangers,
      bookingId: data.bookingId || null,
      overs: data.overs || 6,
      players: [], // [{ id, name, role }]
      teams: {
        A: { name: 'Team A', captainId: null, playerIds: [] },
        B: { name: 'Team B', captainId: null, playerIds: [] },
      },
      toss: null, // { wonBy: 'A'|'B', elected: 'bat'|'bowl' }
      innings: [], // [inning0, inning1]
      currentInningsIndex: 0,
      timeline: [], // [{ time, text }]
    };

    const all = await readJSON(MATCHES_KEY, {});
    all[id] = match;
    await writeJSON(MATCHES_KEY, all);

    // Sync match creation to cloud backend in background
    (async () => {
      try {
        await client.post('/matches', {
          place: match.place,
          sport: match.sport,
          date: match.date,
          time: match.time,
          overs: match.overs,
          playWithStrangers: match.playWithStrangers,
          bookingId: match.bookingId,
        });
      } catch {}
    })();

    return match;
  },

  // ── Recent players ────────────────────────────────────────────────────────
  async getRecentPlayers() {
    return readJSON(RECENT_PLAYERS_KEY, []);
  },

  async addRecentPlayers(players) {
    const existing = await readJSON(RECENT_PLAYERS_KEY, []);
    const map = new Map();
    existing.forEach((p) => map.set(p.name.toLowerCase().trim(), p));
    players.forEach((p) => map.set(p.name.toLowerCase().trim(), p));
    const merged = Array.from(map.values()).slice(0, 30);
    await writeJSON(RECENT_PLAYERS_KEY, merged);
  },
};