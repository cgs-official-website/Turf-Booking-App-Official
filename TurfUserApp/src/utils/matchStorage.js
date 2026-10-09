// src/utils/matchStorage.js
// Offline-first Match/Team/Toss/Scorecard engine with real-time cloud sync.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { client } from '../api/client';

const RECENT_PLAYERS_KEY = '@turf_recent_players';

const genId = (prefix = 'm') =>
  `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

async function getCurrentUserId() {
  try {
    const userStr = await AsyncStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id || user.uid || null;
    }
  } catch (e) {}
  return null;
}

async function getMatchesKey() {
  const uid = await getCurrentUserId();
  return uid ? `@turf_matches_${uid}` : '@turf_matches_guest';
}

function isUserMatch(m, uid) {
  if (!m) return false;
  if (!uid) return true;
  if (m.createdBy && m.createdBy === uid) return true;
  const playerIds = Array.isArray(m.players)
    ? m.players.map((p) => (typeof p === 'string' ? p : (p?.id || p?.userId)))
    : [];
  if (playerIds.includes(uid)) return true;
  return false;
}

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

function mergeTeams(localTeams, serverTeams) {
  const localA = localTeams?.A?.playerIds || localTeams?.teamA?.playerIds || [];
  const localB = localTeams?.B?.playerIds || localTeams?.teamB?.playerIds || [];
  const serverA = serverTeams?.A?.playerIds || serverTeams?.teamA?.playerIds || [];
  const serverB = serverTeams?.B?.playerIds || serverTeams?.teamB?.playerIds || [];

  if (localA.length + localB.length > 0 && serverA.length + serverB.length === 0) {
    return localTeams;
  }
  if (serverA.length + serverB.length > 0) {
    return serverTeams;
  }
  return localTeams || serverTeams || { A: { name: 'Team A', playerIds: [] }, B: { name: 'Team B', playerIds: [] } };
}

export function normalizeMatch(m) {
  if (!m) return null;
  const rawScorecard = m.scorecard && typeof m.scorecard === 'object' ? m.scorecard : {};
  const toss = m.toss && typeof m.toss === 'object' ? m.toss : (rawScorecard.toss && typeof rawScorecard.toss === 'object' ? rawScorecard.toss : null);

  const innings = Array.isArray(m.innings) && m.innings.length > 0
    ? m.innings
    : (Array.isArray(rawScorecard.innings) ? rawScorecard.innings : []);

  let currentInningsIndex = 0;
  if (m.currentInningsIndex !== undefined && m.currentInningsIndex !== null) {
    currentInningsIndex = Number(m.currentInningsIndex);
  } else if (rawScorecard.currentInning !== undefined && rawScorecard.currentInning !== null) {
    currentInningsIndex = Number(rawScorecard.currentInning);
  } else if (rawScorecard.currentInningsIndex !== undefined && rawScorecard.currentInningsIndex !== null) {
    currentInningsIndex = Number(rawScorecard.currentInningsIndex);
  } else if (innings.length > 1) {
    currentInningsIndex = 1;
  }

  const resultText = m.resultText || m.result || rawScorecard.resultText || rawScorecard.result || '';
  const overs = m.overs || rawScorecard.overs || 6;
  let status = String(m.status || rawScorecard.status || 'created').toLowerCase();

  const isSecondInningsDone = innings.length > 1 && (
    Boolean(innings[1]?.completed) ||
    Boolean(innings[1]?.target && innings[1]?.totalRuns >= innings[1]?.target)
  );

  const football = m.football || rawScorecard.football || null;
  const badminton = m.badminton || rawScorecard.badminton || null;
  const volleyball = m.volleyball || rawScorecard.volleyball || null;
  const basketball = m.basketball || rawScorecard.basketball || null;
  const tennis = m.tennis || rawScorecard.tennis || null;

  if (isSecondInningsDone || Boolean(resultText) || football?.half === 4 || badminton?.matchWinner || volleyball?.matchWinner || tennis?.matchWinner || basketball?.quarter === 'Final') {
    status = 'completed';
  }

  const teams = m.teams || rawScorecard.teams || {
    A: { name: 'Team A', playerIds: [], players: [] },
    B: { name: 'Team B', playerIds: [], players: [] },
  };
  if (!teams.A && teams.teamA) teams.A = teams.teamA;
  if (!teams.B && teams.teamB) teams.B = teams.teamB;

  const timeline = Array.isArray(m.timeline)
    ? m.timeline
    : (Array.isArray(rawScorecard.timeline) ? rawScorecard.timeline : []);

  const scorecard = {
    ...rawScorecard,
    innings,
    currentInningsIndex,
    currentInning: currentInningsIndex,
    resultText,
    result: resultText,
    overs,
    toss,
    teams,
    timeline,
    ...(football ? { football } : {}),
    ...(badminton ? { badminton } : {}),
    ...(volleyball ? { volleyball } : {}),
    ...(basketball ? { basketball } : {}),
    ...(tennis ? { tennis } : {}),
  };

  return {
    ...m,
    status,
    teams,
    toss,
    innings,
    currentInningsIndex,
    resultText,
    result: resultText,
    overs,
    timeline,
    football,
    badminton,
    volleyball,
    basketball,
    tennis,
    scorecard,
  };
}

export const matchStorage = {
  genId,

  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const matchKeys = keys.filter((k) => k.startsWith('@turf_matches'));
      if (matchKeys.length > 0) {
        await AsyncStorage.multiRemove(matchKeys);
      }
    } catch (_) {}
  },

  async getAllMatches() {
    const key = await getMatchesKey();
    const currentUid = await getCurrentUserId();
    const all = await readJSON(key, {});
    return Object.values(all)
      .map(normalizeMatch)
      .filter((m) => isUserMatch(m, currentUid))
      .sort((a, b) => new Date(b.createdAt || b.matchDate || 0) - new Date(a.createdAt || a.matchDate || 0));
  },

  async getMyMatches(statusFilter) {
    const key = await getMatchesKey();
    const currentUid = await getCurrentUserId();

    // Clean up legacy non-scoped storage key if it exists
    AsyncStorage.removeItem('@turf_matches').catch(() => {});

    const all = await readJSON(key, {});
    let localMatches = Object.values(all)
      .map(normalizeMatch)
      .filter((m) => isUserMatch(m, currentUid));

    try {
      const url = `/matches/mine${statusFilter ? `?status=${statusFilter}` : ''}`;
      const serverRes = await client.get(url);
      const serverList = serverRes?.matches || serverRes?.data || (Array.isArray(serverRes) ? serverRes : null);

      if (Array.isArray(serverList)) {
        const syncedAll = {};
        // Keep unsynced local matches created by current user
        Object.values(all).forEach((m) => {
          if (m && m.id && isUserMatch(m, currentUid)) {
            syncedAll[m.id] = normalizeMatch(m);
          }
        });

        // Merge server matches
        serverList.forEach((m) => {
          if (m && m.id) {
            const local = all[m.id] || {};
            const localStatus = String(local.status || '').toLowerCase();
            const serverStatus = String(m.status || '').toLowerCase();
            const mergedStatus = localStatus === 'completed' ? 'completed' : (serverStatus || localStatus);
            syncedAll[m.id] = normalizeMatch({
              ...local,
              ...m,
              status: mergedStatus,
            });
          }
        });

        await writeJSON(key, syncedAll);

        let result = Object.values(syncedAll)
          .map(normalizeMatch)
          .filter((m) => isUserMatch(m, currentUid));

        if (statusFilter) {
          result = result.filter((m) => (m.status || '').toLowerCase() === statusFilter.toLowerCase());
        }
        return result.sort((a, b) => new Date(b.createdAt || b.matchDate || 0) - new Date(a.createdAt || a.matchDate || 0));
      }
    } catch (e) {
      // Offline fallback
    }

    if (statusFilter) {
      localMatches = localMatches.filter((m) => (m.status || '').toLowerCase() === statusFilter.toLowerCase());
    }
    return localMatches.sort((a, b) => new Date(b.createdAt || b.matchDate || 0) - new Date(a.createdAt || a.matchDate || 0));
  },

  async getMatch(id) {
    if (!id) return null;
    const key = await getMatchesKey();
    const currentUid = await getCurrentUserId();
    const all = await readJSON(key, {});
    const local = all[id] ? normalizeMatch(all[id]) : null;

    try {
      const serverRes = await client.get(`/matches/${id}`);
      const serverMatch = serverRes?.match || serverRes?.data;
      if (serverMatch) {
        const localPlayers = Array.isArray(local?.players) && local.players.length > 0 ? local.players : null;
        const serverPlayers = Array.isArray(serverMatch.players) && serverMatch.players.length > 0 ? serverMatch.players : null;
        const mergedPlayers = localPlayers || serverPlayers || [];

        const mergedTeams = mergeTeams(local?.teams, serverMatch.teams);

        const mergedPlayerNames = {
          ...(local?.playerNames || {}),
          ...(serverMatch.playerNames || {}),
        };

        const merged = normalizeMatch({
          ...(local || {}),
          ...serverMatch,
          players: mergedPlayers,
          teams: mergedTeams,
          playerNames: mergedPlayerNames,
          id,
        });

        if (isUserMatch(merged, currentUid)) {
          all[id] = merged;
          await writeJSON(key, all);
        }
        return merged;
      }
    } catch (err) {
      const isNotFound = err?.message && (err.message.includes('404') || err.message.toLowerCase().includes('not found') || err.message.toLowerCase().includes('denied'));
      if (isNotFound) {
        delete all[id];
        await writeJSON(key, all);
        return null;
      }
    }

    return local;
  },

  async saveMatch(match) {
    if (!match || !match.id) return match;
    const key = await getMatchesKey();
    const currentUid = await getCurrentUserId();
    const normalized = normalizeMatch(match);
    if (currentUid && !normalized.createdBy) {
      normalized.createdBy = currentUid;
    }

    const all = await readJSON(key, {});
    all[normalized.id] = normalized;
    await writeJSON(key, all);

    // Asynchronous background sync to backend without blocking UI thread
    client.patch(`/matches/${normalized.id}/scorecard`, {
      scorecard: normalized.scorecard,
      status: normalized.status,
      teams: normalized.teams,
      toss: normalized.toss,
      ...(normalized.resultText ? { resultText: normalized.resultText } : {}),
    }).catch((err) => console.log('saveMatch background sync notice:', err?.message || err));

    return normalized;
  },

  async updateMatch(id, patch = {}) {
    const key = await getMatchesKey();
    const currentUid = await getCurrentUserId();
    const all = await readJSON(key, {});
    const existing = all[id] || { id, createdAt: Date.now(), createdBy: currentUid };
    const updated = normalizeMatch({ ...existing, ...patch, id });
    if (currentUid && !updated.createdBy) {
      updated.createdBy = currentUid;
    }
    all[id] = updated;
    await writeJSON(key, all);

    // Asynchronous background sync to backend without blocking UI thread
    client.patch(`/matches/${id}/scorecard`, {
      scorecard: updated.scorecard,
      status: updated.status,
      teams: updated.teams,
      toss: updated.toss,
      ...(updated.resultText ? { resultText: updated.resultText } : {}),
    }).catch((err) => console.log('updateMatch background sync notice:', err?.message || err));

    return updated;
  },

  async addTimeline(id, text) {
    const key = await getMatchesKey();
    const all = await readJSON(key, {});
    const m = all[id];
    if (!m) return;
    m.timeline = m.timeline || [];
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    m.timeline.unshift({ time: timeStr, text });
    all[id] = m;
    await writeJSON(key, all);
  },

  async deleteMatch(id) {
    const key = await getMatchesKey();
    const all = await readJSON(key, {});
    delete all[id];
    await writeJSON(key, all);
  },

  async createMatch(data = {}) {
    const localId = genId('match');
    const currentUid = await getCurrentUserId();
    const match = {
      id: localId,
      createdBy: currentUid || null,
      status: 'created', // created -> live -> completed
      createdAt: Date.now(),
      place: data.place || 'Turf Arena',
      sport: data.sport || 'Cricket',
      date: data.date || 'Today',
      time: data.time || '07:00 PM',
      playWithStrangers: !!data.playWithStrangers,
      bookingId: data.bookingId || null,
      turfId: data.turfId || null,
      overs: data.overs || 6,
      lastManEnabled: data.lastManEnabled ?? false,
      players: currentUid ? [{ userId: currentUid }] : [], // [{ id, name, role }]
      teams: {
        A: { name: 'Team A', captainId: null, playerIds: [] },
        B: { name: 'Team B', captainId: null, playerIds: [] },
      },
      toss: null, // { wonBy: 'A'|'B', elected: 'bat'|'bowl' }
      innings: [], // [inning0, inning1]
      currentInningsIndex: 0,
      timeline: [], // [{ time, text }]
    };

    // Attempt synchronous backend match creation to acquire PostgreSQL match ID & join code
    try {
      const serverRes = await client.post('/matches', {
        id: localId,
        place: match.place,
        sport: match.sport,
        date: match.date,
        time: match.time,
        overs: match.overs,
        playWithStrangers: match.playWithStrangers,
        bookingId: match.bookingId,
        turfId: match.turfId,
        teams: match.teams,
      });

      const serverMatch = serverRes?.match || serverRes?.data;
      if (serverMatch?.id) {
        match.id = serverMatch.id;
        match.joinCode = serverMatch.joinCode;
        if (serverMatch.createdBy) match.createdBy = serverMatch.createdBy;
      }
    } catch (err) {
      console.warn('Backend match creation sync failed (will store locally):', err);
    }

    const key = await getMatchesKey();
    const all = await readJSON(key, {});
    all[match.id] = match;
    await writeJSON(key, all);

    return match;
  },
};

export const playerStorage = {
  async getRecentPlayers() {
    const list = await readJSON(RECENT_PLAYERS_KEY, []);
    const dummyIds = new Set(['p_1', 'p_2', 'p_3', 'p_4']);
    const dummyNames = new Set(['madhan raj', 'karthik', 'suresh', 'venkatesh']);
    const filtered = (list || []).filter(
      (p) => p && !dummyIds.has(p.id) && !dummyNames.has(String(p.name || '').toLowerCase().trim())
    );
    if (filtered.length !== (list || []).length) {
      await writeJSON(RECENT_PLAYERS_KEY, filtered);
    }
    return filtered;
  },

  async addGuestPlayer({ name, phone }) {
    const guest = {
      id: genId('guest'),
      name: name.trim(),
      phone: phone ? phone.trim() : '',
      isGuest: true,
    };
    const list = await this.getRecentPlayers();
    const updated = [guest, ...list.filter((p) => p.name.toLowerCase().trim() !== guest.name.toLowerCase().trim())];
    await writeJSON(RECENT_PLAYERS_KEY, updated);
    return guest;
  },

  async addRecentPlayers(players = []) {
    const existing = await readJSON(RECENT_PLAYERS_KEY, []);
    const map = new Map();
    existing.forEach((p) => map.set(p.name.toLowerCase().trim(), p));
    players.forEach((p) => map.set(p.name.toLowerCase().trim(), p));
    const merged = Array.from(map.values()).slice(0, 30);
    await writeJSON(RECENT_PLAYERS_KEY, merged);
  },
};