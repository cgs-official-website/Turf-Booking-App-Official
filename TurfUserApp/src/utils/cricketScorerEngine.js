/**
 * Client-Side Cricket Engine for Live Ball-by-Ball Scoring (CricHeroes Pattern)
 */

export const oversString = (legalBalls) => {
  const b = Math.max(0, parseInt(legalBalls, 10) || 0);
  const full = Math.floor(b / 6);
  const rem = b % 6;
  return `${full}.${rem}`;
};

export const srString = (runs, balls) => {
  const b = parseInt(balls, 10) || 0;
  const r = parseInt(runs, 10) || 0;
  if (b === 0) return '0.0';
  return ((r / b) * 100).toFixed(1);
};

export const econString = (runs, legalBalls) => {
  const b = parseInt(legalBalls, 10) || 0;
  const r = parseInt(runs, 10) || 0;
  if (b === 0) return '0.0';
  return ((r / (b / 6))).toFixed(1);
};

export const crrString = (runs, legalBalls) => {
  const b = parseInt(legalBalls, 10) || 0;
  const r = parseInt(runs, 10) || 0;
  if (b === 0) return '0.0';
  return ((r / (b / 6))).toFixed(2);
};

export const rrrString = (target, currentRuns, remainingBalls) => {
  const remRuns = Math.max(0, (target || 0) - (currentRuns || 0));
  const remBalls = Math.max(0, remainingBalls || 0);
  if (remBalls === 0) return remRuns === 0 ? '0.0' : '99.9';
  return ((remRuns / (remBalls / 6))).toFixed(2);
};

export const createEmptyInnings = (battingTeam, bowlingTeam, maxOvers = 10) => {
  return {
    battingTeamId: battingTeam?.id || null,
    battingTeamName: battingTeam?.name || battingTeam?.teamName || 'Batting Team',
    bowlingTeamId: bowlingTeam?.id || null,
    bowlingTeamName: bowlingTeam?.name || bowlingTeam?.teamName || 'Bowling Team',
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    overs: '0.0',
    maxOvers: Number(maxOvers) || 10,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    currentStrikerId: null,
    currentNonStrikerId: null,
    currentBowlerId: null,
    batters: {},
    bowlers: {},
    currentOverBalls: [],
    ballHistory: [],
    fallOfWickets: [],
    snapshots: [],
    isCompleted: false,
  };
};

export const ensureBatter = (inn, id, name) => {
  if (!id) return;
  const sId = String(id);
  if (!inn.batters) inn.batters = {};
  if (!inn.batters[sId]) {
    inn.batters[sId] = {
      id: sId,
      name: name || `Batter ${sId}`,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      out: false,
      dismissal: null,
    };
  } else if (name && (inn.batters[sId].name.startsWith('Batter ') || inn.batters[sId].name === 'Striker' || inn.batters[sId].name === 'Non-Striker')) {
    inn.batters[sId].name = name;
  }
};

export const ensureBowler = (inn, id, name) => {
  if (!id) return;
  const sId = String(id);
  if (!inn.bowlers) inn.bowlers = {};
  if (!inn.bowlers[sId]) {
    inn.bowlers[sId] = {
      id: sId,
      name: name || `Bowler ${sId}`,
      balls: 0,
      overs: '0.0',
      maidens: 0,
      runs: 0,
      wickets: 0,
      economy: '0.0',
    };
  } else if (name && (inn.bowlers[sId].name.startsWith('Bowler ') || inn.bowlers[sId].name === 'Bowler')) {
    inn.bowlers[sId].name = name;
  }
};

export const processBallEvent = (innings, event, target = null) => {
  if (!innings || innings.isCompleted) return { innings, overFinished: false, wicketFell: false, inningsCompleted: true };

  const inn = JSON.parse(JSON.stringify(innings));

  // Snapshot before making changes (limit to 30 snapshots)
  inn.snapshots = Array.isArray(inn.snapshots) ? inn.snapshots : [];
  const snapshot = JSON.parse(JSON.stringify(innings));
  delete snapshot.snapshots;
  inn.snapshots.push(snapshot);
  if (inn.snapshots.length > 30) {
    inn.snapshots.shift();
  }

  const rawType = String(event.type || event.kind || 'RUN').toUpperCase();
  const runs = Number(event.runs !== undefined ? event.runs : (parseInt(rawType, 10) || 0));
  const extraRuns = Number(event.extraRuns) || 0;

  let isLegal = true;
  let batRuns = 0;
  let bowlerRuns = 0;
  let totalBallRuns = 0;
  let ballBadge = '0';
  let isWicket = false;

  const strikerId = String(event.strikerId || inn.currentStrikerId || '');
  const nonStrikerId = String(event.nonStrikerId || inn.currentNonStrikerId || '');
  const bowlerId = String(event.bowlerId || inn.currentBowlerId || '');

  if (strikerId) ensureBatter(inn, strikerId, event.strikerName);
  if (nonStrikerId) ensureBatter(inn, nonStrikerId, event.nonStrikerName);
  if (bowlerId) ensureBowler(inn, bowlerId, event.bowlerName);

  let type = rawType;
  if (['0', '1', '2', '3', '4', '6'].includes(rawType)) {
    type = 'RUN';
  }

  switch (type) {
    case 'RUN':
    case 'DOT':
      batRuns = runs;
      bowlerRuns = runs;
      totalBallRuns = runs;
      ballBadge = String(runs);
      break;
    case 'WD':
      isLegal = false;
      inn.extras.wides += 1 + runs;
      bowlerRuns = 1 + runs;
      totalBallRuns = 1 + runs;
      ballBadge = runs > 0 ? `${runs + 1}WD` : 'WD';
      break;
    case 'NB':
      isLegal = false;
      inn.extras.noBalls += 1;
      batRuns = runs;
      bowlerRuns = 1 + runs;
      totalBallRuns = 1 + runs;
      ballBadge = runs > 0 ? `${runs}NB` : 'NB';
      break;
    case 'BYE':
      inn.extras.byes += runs;
      totalBallRuns = runs;
      ballBadge = `${runs}B`;
      break;
    case 'LB':
      inn.extras.legByes += runs;
      totalBallRuns = runs;
      ballBadge = `${runs}LB`;
      break;
    case 'W':
      isWicket = true;
      batRuns = runs;
      bowlerRuns = runs;
      totalBallRuns = runs;
      ballBadge = runs > 0 ? `${runs}W` : 'W';
      break;
    default:
      totalBallRuns = runs;
      ballBadge = String(runs);
  }

  inn.runs += totalBallRuns;
  inn.extras.total = inn.extras.wides + inn.extras.noBalls + inn.extras.byes + inn.extras.legByes;

  if (strikerId && inn.batters[strikerId]) {
    inn.batters[strikerId].runs += batRuns;
    if (type !== 'WD') inn.batters[strikerId].balls += 1;
    if (batRuns === 4) inn.batters[strikerId].fours += 1;
    if (batRuns === 6) inn.batters[strikerId].sixes += 1;
  }

  if (bowlerId && inn.bowlers[bowlerId]) {
    inn.bowlers[bowlerId].runs += bowlerRuns;
    if (isLegal) {
      inn.bowlers[bowlerId].balls += 1;
      inn.bowlers[bowlerId].overs = oversString(inn.bowlers[bowlerId].balls);
    }
    if (isWicket && event.dismissal !== 'run_out') {
      inn.bowlers[bowlerId].wickets += 1;
    }
    inn.bowlers[bowlerId].economy = econString(inn.bowlers[bowlerId].runs, inn.bowlers[bowlerId].balls);
  }

  if (isLegal) {
    inn.legalBalls += 1;
    inn.overs = oversString(inn.legalBalls);
  }

  if (isWicket) {
    inn.wickets += 1;
    if (strikerId && inn.batters[strikerId]) {
      inn.batters[strikerId].out = true;
      inn.batters[strikerId].dismissal = event.dismissal || 'bowled';
    }
    inn.fallOfWickets.push({
      wicketNumber: inn.wickets,
      score: inn.runs,
      overs: inn.overs,
      batterId: strikerId,
      batterName: inn.batters[strikerId]?.name || event.strikerName || 'Batter',
      dismissal: event.dismissal || 'bowled',
    });
  }

  const ballRecord = {
    ballNumber: inn.ballHistory.length + 1,
    badge: ballBadge,
    type,
    runs,
    extraRuns,
    totalBallRuns,
    isLegal,
    isWicket,
    strikerId,
    nonStrikerId,
    bowlerId,
    dismissal: event.dismissal || null,
  };

  inn.ballHistory.push(ballRecord);
  inn.currentOverBalls.push(ballBadge);

  let rotateStrike = false;
  let overFinished = false;

  if (!isWicket) {
    if (batRuns % 2 === 1 || ((type === 'BYE' || type === 'LB') && runs % 2 === 1)) {
      rotateStrike = true;
    }

    if (isLegal && inn.legalBalls % 6 === 0) {
      overFinished = true;
      // Strike rotates at the end of an over
      rotateStrike = !rotateStrike;

      // Maiden over check: if no bowler runs in the 6 balls of this over
      const ballsInThisOver = inn.ballHistory.slice(-6);
      const bowlerRunsInOver = ballsInThisOver.reduce((sum, b) => {
        if (b.type === 'BYE' || b.type === 'LB') return sum;
        return sum + (b.totalBallRuns || 0);
      }, 0);
      if (bowlerRunsInOver === 0 && bowlerId && inn.bowlers[bowlerId]) {
        inn.bowlers[bowlerId].maidens = (inn.bowlers[bowlerId].maidens || 0) + 1;
      }

      inn.currentOverBalls = [];
    }

    if (rotateStrike && inn.currentStrikerId && inn.currentNonStrikerId) {
      const temp = inn.currentStrikerId;
      inn.currentStrikerId = inn.currentNonStrikerId;
      inn.currentNonStrikerId = temp;
    }
  } else {
    // Wicket fell: dismissed batter is marked out. Striker/non-striker handled by new batter selection
    if (isLegal && inn.legalBalls % 6 === 0) {
      overFinished = true;

      const ballsInThisOver = inn.ballHistory.slice(-6);
      const bowlerRunsInOver = ballsInThisOver.reduce((sum, b) => {
        if (b.type === 'BYE' || b.type === 'LB') return sum;
        return sum + (b.totalBallRuns || 0);
      }, 0);
      if (bowlerRunsInOver === 0 && bowlerId && inn.bowlers[bowlerId]) {
        inn.bowlers[bowlerId].maidens = (inn.bowlers[bowlerId].maidens || 0) + 1;
      }

      inn.currentOverBalls = [];
    }
  }

  let inningsCompleted = false;
  const maxBalls = (inn.maxOvers || 10) * 6;
  if (inn.legalBalls >= maxBalls || inn.wickets >= 10) {
    inningsCompleted = true;
    inn.isCompleted = true;
  }
  if (target && inn.runs >= target) {
    inningsCompleted = true;
    inn.isCompleted = true;
  }

  return {
    innings: inn,
    overFinished,
    wicketFell: isWicket,
    inningsCompleted,
    lastBall: ballRecord,
  };
};

export const undoLastBall = (innings) => {
  if (!innings) return innings;

  // Snapshot undo (fast and reliable)
  if (Array.isArray(innings.snapshots) && innings.snapshots.length > 0) {
    const snaps = [...innings.snapshots];
    const previousState = snaps.pop();
    previousState.snapshots = snaps;
    return previousState;
  }

  // Fallback replay
  if (!innings.ballHistory || innings.ballHistory.length === 0) return innings;
  const history = [...innings.ballHistory];
  history.pop();

  const fresh = createEmptyInnings(
    { id: innings.battingTeamId, name: innings.battingTeamName },
    { id: innings.bowlingTeamId, name: innings.bowlingTeamName },
    innings.maxOvers
  );
  fresh.currentStrikerId = innings.initialStrikerId || innings.currentStrikerId;
  fresh.currentNonStrikerId = innings.initialNonStrikerId || innings.currentNonStrikerId;
  fresh.currentBowlerId = innings.initialBowlerId || innings.currentBowlerId;

  // Preserve pre-existing batters and bowlers
  fresh.batters = JSON.parse(JSON.stringify(innings.batters || {}));
  Object.values(fresh.batters).forEach((b) => {
    b.runs = 0;
    b.balls = 0;
    b.fours = 0;
    b.sixes = 0;
    b.out = false;
    b.dismissal = null;
  });

  fresh.bowlers = JSON.parse(JSON.stringify(innings.bowlers || {}));
  Object.values(fresh.bowlers).forEach((bw) => {
    bw.balls = 0;
    bw.overs = '0.0';
    bw.maidens = 0;
    bw.runs = 0;
    bw.wickets = 0;
    bw.economy = '0.0';
  });

  let current = fresh;
  for (const b of history) {
    const res = processBallEvent(current, b);
    current = res.innings;
  }
  return current;
};

export const calculateMatchPerformances = (match) => {
  const performances = [];
  const live = match?.liveCricket;
  if (!live) return { performances: [], awards: {} };

  const playerStats = {};

  const processInnings = (inn) => {
    if (!inn) return;
    Object.values(inn.batters || {}).forEach((b) => {
      const pid = String(b.id);
      if (!playerStats[pid]) {
        playerStats[pid] = {
          id: pid,
          name: b.name,
          teamId: inn.battingTeamId,
          teamName: inn.battingTeamName,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          wickets: 0,
          overs: '0.0',
          bowlingRuns: 0,
          bowlingBalls: 0,
          maidens: 0,
          out: b.out || false,
          dismissal: b.dismissal || null,
        };
      }
      playerStats[pid].runs += b.runs || 0;
      playerStats[pid].balls += b.balls || 0;
      playerStats[pid].fours += b.fours || 0;
      playerStats[pid].sixes += b.sixes || 0;
      if (b.out) {
        playerStats[pid].out = true;
        playerStats[pid].dismissal = b.dismissal;
      }
    });

    Object.values(inn.bowlers || {}).forEach((bw) => {
      const pid = String(bw.id);
      if (!playerStats[pid]) {
        playerStats[pid] = {
          id: pid,
          name: bw.name,
          teamId: inn.bowlingTeamId,
          teamName: inn.bowlingTeamName,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          wickets: 0,
          overs: '0.0',
          bowlingRuns: 0,
          bowlingBalls: 0,
          maidens: 0,
          out: false,
          dismissal: null,
        };
      }
      playerStats[pid].wickets += bw.wickets || 0;
      playerStats[pid].bowlingBalls += bw.balls || 0;
      playerStats[pid].bowlingRuns += bw.runs || 0;
      playerStats[pid].maidens += bw.maidens || 0;
      playerStats[pid].overs = oversString(playerStats[pid].bowlingBalls);
    });
  };

  processInnings(live.innings1);
  processInnings(live.innings2);

  Object.values(playerStats).forEach((p) => {
    const sr = p.balls > 0 ? (p.runs / p.balls) * 100 : 0;
    const econ = p.bowlingBalls > 0 ? (p.bowlingRuns / (p.bowlingBalls / 6)) : 0;

    let battingPts = (p.runs * 1.0) + (p.fours * 1.0) + (p.sixes * 2.0);
    if (p.runs >= 50) battingPts += 25;
    else if (p.runs >= 25) battingPts += 10;

    let bowlingPts = (p.wickets * 25) + (p.maidens * 15) - Math.floor(p.bowlingRuns * 0.5);
    if (p.wickets >= 5) bowlingPts += 16;
    else if (p.wickets >= 3) bowlingPts += 8;

    const points = Math.max(0, battingPts + bowlingPts);

    let grade = 'C';
    if (points >= 50 || p.runs >= 50 || p.wickets >= 3) grade = 'A+';
    else if (points >= 35 || p.runs >= 35 || p.wickets >= 2) grade = 'A';
    else if (points >= 22 || p.runs >= 20 || p.wickets >= 1) grade = 'B+';
    else if (points >= 12 || p.runs >= 10) grade = 'B';

    performances.push({
      id: p.id,
      name: p.name,
      teamId: p.teamId,
      teamName: p.teamName,
      runs: p.runs,
      balls: p.balls,
      strikeRate: sr.toFixed(1),
      fours: p.fours,
      sixes: p.sixes,
      wickets: p.wickets,
      overs: p.overs,
      maidens: p.maidens,
      runsConceded: p.bowlingRuns,
      economy: econ.toFixed(1),
      impactPoints: Math.round(points),
      grade,
      summaryText: `${p.runs > 0 ? `${p.runs} (${p.balls}b)` : ''}${p.runs > 0 && p.wickets > 0 ? ' & ' : ''}${p.bowlingBalls > 0 ? `${p.wickets}/${p.bowlingRuns} (${p.overs} ov)` : ''}`,
    });
  });

  performances.sort((a, b) => b.impactPoints - a.impactPoints);

  const awards = {
    playerOfTheMatch: performances[0] || null,
    bestBatter: [...performances].filter((p) => p.runs > 0).sort((a, b) => {
      if (b.runs !== a.runs) return b.runs - a.runs;
      return parseFloat(b.strikeRate) - parseFloat(a.strikeRate);
    })[0] || null,
    bestBowler: [...performances].filter((p) => p.wickets > 0).sort((a, b) => {
      if (b.wickets !== a.wickets) return b.wickets - a.wickets;
      return parseFloat(a.economy) - parseFloat(b.economy);
    })[0] || null,
    mostRuns: [...performances].sort((a, b) => b.runs - a.runs)[0] || null,
    mostWickets: [...performances].sort((a, b) => b.wickets - a.wickets)[0] || null,
  };

  return { performances, awards };
};

export const calculateTournamentLeaders = (tournament) => {
  if (!tournament || !tournament.bracket || !Array.isArray(tournament.bracket.rounds)) {
    return {
      allPlayers: [],
      podium: [],
      awards: {},
      leaderboards: {
        runs: [],
        wickets: [],
        strikeRate: [],
        economy: [],
        sixes: [],
        fours: [],
        fielding: [],
      },
      isFinalized: false,
    };
  }

  const rounds = tournament.bracket.rounds || [];
  const allMatches = rounds.flatMap((r) => r.matches || []);
  const completedMatches = allMatches.filter((m) => m && (m.status === 'completed' || m.winner));
  const isFinalized = tournament.bracket.status === 'completed' || (allMatches.length > 0 && completedMatches.length === allMatches.length);

  const playerStatsMap = new Map();

  const getOrCreate = (id, name, teamId, teamName) => {
    const sId = String(id);
    if (!playerStatsMap.has(sId)) {
      playerStatsMap.set(sId, {
        id: sId,
        name: name || `Player ${sId}`,
        teamId: teamId || null,
        teamName: teamName || 'Team',
        avatar: null,
        matchesPlayed: 0,
        inningsBatted: 0,
        inningsBowled: 0,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        dismissals: 0,
        notOuts: 0,
        wickets: 0,
        bowlingBalls: 0,
        bowlingRuns: 0,
        maidens: 0,
        catches: 0,
        runOuts: 0,
        stumpings: 0,
      });
    }
    const rec = playerStatsMap.get(sId);
    if (name && (rec.name.startsWith('Player ') || rec.name === 'Striker' || rec.name === 'Non-Striker')) {
      rec.name = name;
    }
    if (teamName && rec.teamName === 'Team') {
      rec.teamName = teamName;
    }
    return rec;
  };

  allMatches.forEach((m) => {
    if (!m.liveCricket) return;
    const { innings1, innings2 } = m.liveCricket;
    const involvedPlayerIdsInThisMatch = new Set();

    const processInnings = (inn) => {
      if (!inn) return;
      const bTeamId = inn.battingTeamId;
      const bTeamName = inn.battingTeamName;
      const bwTeamId = inn.bowlingTeamId;
      const bwTeamName = inn.bowlingTeamName;

      Object.values(inn.batters || {}).forEach((b) => {
        if (!b.id) return;
        const p = getOrCreate(b.id, b.name, bTeamId, bTeamName);
        involvedPlayerIdsInThisMatch.add(p.id);
        if (b.balls > 0 || b.runs > 0 || b.out) {
          p.runs += Number(b.runs) || 0;
          p.balls += Number(b.balls) || 0;
          p.fours += Number(b.fours) || 0;
          p.sixes += Number(b.sixes) || 0;
          p.inningsBatted += 1;
          if (b.out) {
            p.dismissals += 1;
          } else {
            p.notOuts += 1;
          }
        }
      });

      Object.values(inn.bowlers || {}).forEach((bw) => {
        if (!bw.id) return;
        const p = getOrCreate(bw.id, bw.name, bwTeamId, bwTeamName);
        involvedPlayerIdsInThisMatch.add(p.id);
        if (bw.balls > 0) {
          p.wickets += Number(bw.wickets) || 0;
          p.bowlingBalls += Number(bw.balls) || 0;
          p.bowlingRuns += Number(bw.runs) || 0;
          p.maidens += Number(bw.maidens) || 0;
          p.inningsBowled += 1;
        }
      });

      (inn.fallOfWickets || []).forEach((fow) => {
        if (fow.fielderId) {
          const f = getOrCreate(fow.fielderId, fow.fielderName, bwTeamId, bwTeamName);
          if (fow.dismissal === 'run_out') {
            f.runOuts += 1;
          } else if (fow.dismissal === 'stumped') {
            f.stumpings += 1;
          } else {
            f.catches += 1;
          }
        }
      });
    };

    processInnings(innings1);
    processInnings(innings2);

    involvedPlayerIdsInThisMatch.forEach((pid) => {
      const p = playerStatsMap.get(pid);
      if (p) p.matchesPlayed += 1;
    });
  });

  const playersList = Array.from(playerStatsMap.values()).map((p) => {
    const sr = p.balls > 0 ? (p.runs / p.balls) * 100 : 0;
    const overs = oversString(p.bowlingBalls);
    const econ = p.bowlingBalls > 0 ? (p.bowlingRuns / (p.bowlingBalls / 6)) : 0;
    const fieldingDismissals = p.catches + p.runOuts + p.stumpings;

    let battingPts = (p.runs * 1.0) + (p.fours * 1.0) + (p.sixes * 2.0);
    if (p.runs >= 100) battingPts += 50;
    else if (p.runs >= 50) battingPts += 25;
    else if (p.runs >= 30) battingPts += 10;

    let bowlingPts = (p.wickets * 25) + (p.maidens * 15) - Math.floor(p.bowlingRuns * 0.5);
    if (p.wickets >= 5) bowlingPts += 25;
    else if (p.wickets >= 3) bowlingPts += 12;

    const fieldingPts = (p.catches * 10) + (p.stumpings * 10) + (p.runOuts * 15);
    const impactScore = Math.max(0, battingPts + bowlingPts + fieldingPts);

    let grade = 'C';
    if (impactScore >= 80 || p.runs >= 80 || p.wickets >= 5) grade = 'A+';
    else if (impactScore >= 50 || p.runs >= 50 || p.wickets >= 3) grade = 'A';
    else if (impactScore >= 30 || p.runs >= 30 || p.wickets >= 2) grade = 'B+';
    else if (impactScore >= 15 || p.runs >= 15 || p.wickets >= 1) grade = 'B';

    return {
      ...p,
      strikeRate: sr.toFixed(1),
      strikeRateNum: sr,
      overs,
      economy: econ.toFixed(1),
      economyNum: econ,
      fieldingDismissals,
      impactScore: Math.round(impactScore),
      battingPoints: Math.round(battingPts),
      bowlingPoints: Math.round(bowlingPts),
      fieldingPoints: fieldingPts,
      grade,
    };
  });

  playersList.sort((a, b) => b.impactScore - a.impactScore);

  const podium = playersList.slice(0, 3);

  const leaderRuns = [...playersList]
    .filter((p) => p.runs > 0)
    .sort((a, b) => {
      if (b.runs !== a.runs) return b.runs - a.runs;
      return b.strikeRateNum - a.strikeRateNum;
    });

  const leaderWickets = [...playersList]
    .filter((p) => p.wickets > 0)
    .sort((a, b) => {
      if (b.wickets !== a.wickets) return b.wickets - a.wickets;
      return a.economyNum - b.economyNum;
    });

  const leaderSR = [...playersList]
    .filter((p) => p.balls >= 10)
    .sort((a, b) => b.strikeRateNum - a.strikeRateNum);

  const leaderEconomy = [...playersList]
    .filter((p) => p.bowlingBalls >= 6)
    .sort((a, b) => a.economyNum - b.economyNum);

  const leaderSixes = [...playersList]
    .filter((p) => p.sixes > 0)
    .sort((a, b) => {
      if (b.sixes !== a.sixes) return b.sixes - a.sixes;
      return b.runs - a.runs;
    });

  const leaderFours = [...playersList]
    .filter((p) => p.fours > 0)
    .sort((a, b) => {
      if (b.fours !== a.fours) return b.fours - a.fours;
      return b.runs - a.runs;
    });

  const leaderFielding = [...playersList]
    .filter((p) => p.fieldingDismissals > 0)
    .sort((a, b) => b.fieldingDismissals - a.fieldingDismissals);

  const allRounders = [...playersList]
    .filter((p) => p.runs >= 15 && p.wickets >= 1)
    .sort((a, b) => (b.battingPoints + b.bowlingPoints) - (a.battingPoints + a.bowlingPoints));

  const awards = {
    playerOfTournament: playersList[0] || null,
    bestBatter: leaderRuns[0] || null,
    bestBowler: leaderWickets[0] || null,
    bestAllRounder: allRounders[0] || playersList.find((p) => p.runs > 0 && p.wickets > 0) || playersList[0] || null,
    bestFielder: leaderFielding[0] || null,
  };

  return {
    allPlayers: playersList,
    podium,
    awards,
    leaderboards: {
      runs: leaderRuns,
      wickets: leaderWickets,
      strikeRate: leaderSR,
      economy: leaderEconomy,
      sixes: leaderSixes,
      fours: leaderFours,
      fielding: leaderFielding,
    },
    isFinalized,
  };
};

