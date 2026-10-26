/**
 * Pure cricket scoring engine, ball-by-ball processing,
 * performance rating calculation, and match award determination.
 */

const clone = (obj) => JSON.parse(JSON.stringify(obj));

function oversString(balls = 0) {
  const b = Math.max(0, parseInt(balls, 10) || 0);
  return `${Math.floor(b / 6)}.${b % 6}`;
}

function srString(runs = 0, balls = 0) {
  const r = Number(runs) || 0;
  const b = Number(balls) || 0;
  if (b === 0) return '0.0';
  return ((r / b) * 100).toFixed(1);
}

function econString(runs = 0, balls = 0) {
  const r = Number(runs) || 0;
  const b = Number(balls) || 0;
  if (b === 0) return '0.0';
  const ov = b / 6;
  return (r / ov).toFixed(1);
}

function crrString(runs = 0, balls = 0) {
  const r = Number(runs) || 0;
  const b = Number(balls) || 0;
  if (b === 0) return '0.0';
  const ov = b / 6;
  return (r / ov).toFixed(2);
}

function rrrString(target = 0, currentRuns = 0, remainingBalls = 0) {
  const needed = Math.max(0, target - currentRuns);
  if (remainingBalls <= 0) return needed > 0 ? '∞' : '0.0';
  const ov = remainingBalls / 6;
  return (needed / ov).toFixed(2);
}

/**
 * Creates empty innings object
 */
function createEmptyInnings(battingTeam, bowlingTeam, maxOvers = 10) {
  return {
    battingTeamId: battingTeam?.id || 'teamA',
    battingTeamName: battingTeam?.name || battingTeam?.teamName || 'Batting Team',
    bowlingTeamId: bowlingTeam?.id || 'teamB',
    bowlingTeamName: bowlingTeam?.name || bowlingTeam?.teamName || 'Bowling Team',
    maxOvers: Number(maxOvers) || 10,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    overs: '0.0',
    extras: {
      wides: 0,
      noBalls: 0,
      byes: 0,
      legByes: 0,
      total: 0,
    },
    currentStrikerId: null,
    currentNonStrikerId: null,
    currentBowlerId: null,
    currentOverBalls: [],
    overHistory: [],
    batters: {},
    bowlers: {},
    deliveries: [],
    ballHistory: [],
    snapshots: [],
    fallOfWickets: [],
    completed: false,
    isCompleted: false,
  };
}

/**
 * Ensure batter record exists in innings
 */
function getOrCreateBatter(inn, player) {
  if (!player || !player.id) return null;
  const id = String(player.id);
  if (!inn.batters[id]) {
    inn.batters[id] = {
      id,
      name: player.name || player.playerName || 'Batter',
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      out: false,
      dismissal: null,
      isStriker: false,
    };
  }
  return inn.batters[id];
}

/**
 * Ensure bowler record exists in innings
 */
function getOrCreateBowler(inn, player) {
  if (!player || !player.id) return null;
  const id = String(player.id);
  if (!inn.bowlers[id]) {
    inn.bowlers[id] = {
      id,
      name: player.name || player.playerName || 'Bowler',
      balls: 0,
      overs: '0.0',
      maidens: 0,
      runs: 0,
      wickets: 0,
      economy: '0.0',
    };
  }
  return inn.bowlers[id];
}

/**
 * Applies a single ball delivery event to an innings and updates state
 */
function processBallEvent(innings, ballEvent, target = null) {
  const inn = clone(innings);
  const kind = String(ballEvent.kind || '0').toUpperCase();
  const extraRuns = Number(ballEvent.extraRuns) || 0;

  // Retrieve current active players
  const striker = inn.batters[inn.currentStrikerId];
  const nonStriker = inn.batters[inn.currentNonStrikerId];
  const bowler = inn.bowlers[inn.currentBowlerId];

  const deliveryRecord = {
    deliveryNumber: inn.deliveries.length + 1,
    ballNumberInMatch: inn.legalBalls + 1,
    kind,
    extraRuns,
    strikerId: inn.currentStrikerId,
    strikerName: striker?.name || 'Striker',
    nonStrikerId: inn.currentNonStrikerId,
    nonStrikerName: nonStriker?.name || 'Non-Striker',
    bowlerId: inn.currentBowlerId,
    bowlerName: bowler?.name || 'Bowler',
    timestamp: new Date().toISOString(),
  };

  let legalDelivery = true;
  let swapStrike = false;
  let wicketFell = false;

  if (['0', '1', '2', '3', '4', '6'].includes(kind)) {
    const runs = parseInt(kind, 10);
    legalDelivery = true;

    if (striker) {
      striker.runs += runs;
      striker.balls += 1;
      if (runs === 4) striker.fours += 1;
      if (runs === 6) striker.sixes += 1;
    }
    if (bowler) {
      bowler.runs += runs;
      bowler.balls += 1;
    }
    inn.runs += runs;
    inn.legalBalls += 1;
    deliveryRecord.display = String(runs);
    inn.currentOverBalls.push(String(runs));

    if (runs % 2 === 1) {
      swapStrike = true;
    }
  } else if (kind === 'WD') {
    // Wide ball
    legalDelivery = false;
    const runsAdded = 1 + extraRuns;
    inn.runs += runsAdded;
    inn.extras.wides += runsAdded;
    inn.extras.total += runsAdded;

    if (bowler) {
      bowler.runs += runsAdded;
    }
    const label = runsAdded > 1 ? `Wd+${extraRuns}` : 'Wd';
    deliveryRecord.display = label;
    inn.currentOverBalls.push(label);

    if (extraRuns % 2 === 1) {
      swapStrike = true;
    }
  } else if (kind === 'NB') {
    // No ball
    legalDelivery = false;
    const batRuns = Number(ballEvent.batRuns) || extraRuns;
    const runsAdded = 1 + batRuns;
    inn.runs += runsAdded;
    inn.extras.noBalls += 1;
    inn.extras.total += 1;

    if (striker && batRuns > 0) {
      striker.runs += batRuns;
      striker.balls += 1;
      if (batRuns === 4) striker.fours += 1;
      if (batRuns === 6) striker.sixes += 1;
    }
    if (bowler) {
      bowler.runs += runsAdded;
    }
    const label = batRuns > 0 ? `Nb+${batRuns}` : 'Nb';
    deliveryRecord.display = label;
    inn.currentOverBalls.push(label);

    if (batRuns % 2 === 1) {
      swapStrike = true;
    }
  } else if (kind === 'BYE') {
    // Byes (legal ball, runs to extras, not charged to bowler)
    legalDelivery = true;
    const runs = Math.max(1, extraRuns || 1);
    inn.runs += runs;
    inn.legalBalls += 1;
    inn.extras.byes += runs;
    inn.extras.total += runs;

    if (striker) striker.balls += 1;
    if (bowler) bowler.balls += 1;

    deliveryRecord.display = `B${runs}`;
    inn.currentOverBalls.push(`B${runs}`);

    if (runs % 2 === 1) {
      swapStrike = true;
    }
  } else if (kind === 'LB') {
    // Leg Byes
    legalDelivery = true;
    const runs = Math.max(1, extraRuns || 1);
    inn.runs += runs;
    inn.legalBalls += 1;
    inn.extras.legByes += runs;
    inn.extras.total += runs;

    if (striker) striker.balls += 1;
    if (bowler) bowler.balls += 1;

    deliveryRecord.display = `Lb${runs}`;
    inn.currentOverBalls.push(`Lb${runs}`);

    if (runs % 2 === 1) {
      swapStrike = true;
    }
  } else if (kind === 'W') {
    // Wicket
    legalDelivery = true;
    wicketFell = true;
    inn.wickets += 1;
    inn.legalBalls += 1;

    if (striker) {
      striker.balls += 1;
      striker.out = true;
      striker.dismissal = ballEvent.dismissalType || (bowler ? `b ${bowler.name}` : 'Out');
    }
    if (bowler) {
      bowler.balls += 1;
      bowler.wickets += 1;
    }

    deliveryRecord.display = 'W';
    inn.currentOverBalls.push('W');

    inn.fallOfWickets.push({
      score: inn.runs,
      wickets: inn.wickets,
      over: oversString(inn.legalBalls),
      batterId: inn.currentStrikerId,
      batterName: striker?.name || 'Batter',
    });

    // Vacate striker slot until new batsman selected
    inn.currentStrikerId = ballEvent.newBatsman ? String(ballEvent.newBatsman.id) : null;
    if (ballEvent.newBatsman) {
      getOrCreateBatter(inn, ballEvent.newBatsman);
    }
  }

  // Update bowler overs and economy
  if (bowler) {
    bowler.overs = oversString(bowler.balls);
    bowler.economy = econString(bowler.runs, bowler.balls);
  }

  inn.overs = oversString(inn.legalBalls);
  inn.deliveries.push(deliveryRecord);

  // Check over completion (6 legal balls in over)
  let overFinished = false;
  if (legalDelivery && inn.legalBalls > 0 && inn.legalBalls % 6 === 0) {
    overFinished = true;
    // Check for maiden over: if all 6 balls conceded 0 runs off bowler
    const recentOverBalls = inn.currentOverBalls;
    const runsInOver = recentOverBalls.reduce((acc, b) => {
      if (['0', 'W', 'B1', 'B2', 'B3', 'B4', 'Lb1', 'Lb2', 'Lb3', 'Lb4'].includes(b)) return acc;
      const num = parseInt(b.replace(/[^\d]/g, ''), 10);
      return acc + (isNaN(num) ? 1 : num);
    }, 0);

    if (runsInOver === 0 && bowler) {
      bowler.maidens += 1;
    }

    // Archive completed over to over history
    inn.overHistory.push({
      overNumber: Math.floor(inn.legalBalls / 6),
      bowlerId: bowler?.id,
      bowlerName: bowler?.name,
      balls: [...inn.currentOverBalls],
      runs: runsInOver,
    });
    inn.currentOverBalls = [];

    // End of over: swap strike unless a wicket just vacated the striker
    if (!wicketFell) {
      [inn.currentStrikerId, inn.currentNonStrikerId] = [inn.currentNonStrikerId, inn.currentStrikerId];
    } else {
      // Striker was out; non-striker moves to non-striker end
    }

    // Vacate current bowler so next bowler must be selected
    inn.currentBowlerId = ballEvent.nextBowler ? String(ballEvent.nextBowler.id) : null;
    if (ballEvent.nextBowler) {
      getOrCreateBowler(inn, ballEvent.nextBowler);
    }
  } else if (swapStrike && !wicketFell) {
    // Normal mid-over strike rotation
    [inn.currentStrikerId, inn.currentNonStrikerId] = [inn.currentNonStrikerId, inn.currentStrikerId];
  }

  // Check Innings Completion
  const maxBalls = (Number(inn.maxOvers) || 10) * 6;
  const isAllOut = inn.wickets >= 10;
  const isOversDone = inn.legalBalls >= maxBalls;
  const isTargetChased = target !== null && inn.runs >= target;

  if (isAllOut || isOversDone || isTargetChased) {
    inn.completed = true;
  }

  return {
    innings: inn,
    wicketFell,
    overFinished,
    inningsCompleted: inn.completed,
    isTargetChased,
  };
}

/**
 * Undoes the last delivery and recalculates innings state cleanly
 */
function undoLastBall(inningsHistory) {
  if (!inningsHistory || inningsHistory.length <= 1) return null;
  // Return the previous state snapshot
  return clone(inningsHistory[inningsHistory.length - 2]);
}

/**
 * Calculates player performance grades and awards for a completed match
 */
function calculateMatchPerformances(match) {
  if (!match) return { performances: [], awards: {} };

  const inn1 = match.liveCricket?.innings1 || match.innings1 || null;
  const inn2 = match.liveCricket?.innings2 || match.innings2 || null;

  const playerStatsMap = new Map();

  function recordBatter(batter, team) {
    if (!batter || !batter.name) return;
    const pid = String(batter.id || batter.name);
    if (!playerStatsMap.has(pid)) {
      playerStatsMap.set(pid, {
        id: pid,
        name: batter.name,
        teamId: team?.id,
        teamName: team?.name || team?.teamName || 'Team',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        wickets: 0,
        overs: '0.0',
        bowlingBalls: 0,
        maidens: 0,
        runsConceded: 0,
        catches: 0,
      });
    }
    const stat = playerStatsMap.get(pid);
    stat.runs += Number(batter.runs) || 0;
    stat.balls += Number(batter.balls) || 0;
    stat.fours += Number(batter.fours) || 0;
    stat.sixes += Number(batter.sixes) || 0;
    stat.out = batter.out;
    stat.dismissal = batter.dismissal;
  }

  function recordBowler(bowler, team) {
    if (!bowler || !bowler.name) return;
    const pid = String(bowler.id || bowler.name);
    if (!playerStatsMap.has(pid)) {
      playerStatsMap.set(pid, {
        id: pid,
        name: bowler.name,
        teamId: team?.id,
        teamName: team?.name || team?.teamName || 'Team',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        wickets: 0,
        overs: '0.0',
        bowlingBalls: 0,
        maidens: 0,
        runsConceded: 0,
        catches: 0,
      });
    }
    const stat = playerStatsMap.get(pid);
    stat.wickets += Number(bowler.wickets) || 0;
    stat.bowlingBalls += Number(bowler.balls) || 0;
    stat.maidens += Number(bowler.maidens) || 0;
    stat.runsConceded += Number(bowler.runs) || 0;
  }

  if (inn1) {
    const teamBat1 = { id: inn1.battingTeamId, name: inn1.battingTeamName };
    const teamBowl1 = { id: inn1.bowlingTeamId, name: inn1.bowlingTeamName };
    Object.values(inn1.batters || {}).forEach((b) => recordBatter(b, teamBat1));
    Object.values(inn1.bowlers || {}).forEach((bw) => recordBowler(bw, teamBowl1));
  }

  if (inn2) {
    const teamBat2 = { id: inn2.battingTeamId, name: inn2.battingTeamName };
    const teamBowl2 = { id: inn2.bowlingTeamId, name: inn2.bowlingTeamName };
    Object.values(inn2.batters || {}).forEach((b) => recordBatter(b, teamBat2));
    Object.values(inn2.bowlers || {}).forEach((bw) => recordBowler(bw, teamBowl2));
  }

  const performances = Array.from(playerStatsMap.values()).map((p) => {
    const strikeRate = p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(1) : '0.0';
    const overs = oversString(p.bowlingBalls);
    const economy = p.bowlingBalls > 0 ? (p.runsConceded / (p.bowlingBalls / 6)).toFixed(1) : '0.0';

    // Impact Points Calculation:
    // Batting: 1 pt per run, +1 per 4, +2 per 6, +10 for 25+, +25 for 50+
    let battingPts = p.runs * 1 + p.fours * 1 + p.sixes * 2;
    if (p.runs >= 50) battingPts += 25;
    else if (p.runs >= 25) battingPts += 10;

    // Bowling: 25 pts per wicket, 15 pts per maiden, -0.5 pts per run conceded
    let bowlingPts = p.wickets * 25 + p.maidens * 15 - Math.floor(p.runsConceded * 0.5);

    const impactScore = Math.max(0, battingPts + bowlingPts);

    // Performance Grade:
    // A+: Outstanding >= 50
    // A:  Excellent >= 35
    // B+: Good >= 22
    // B:  Average >= 12
    // C:  Participation < 12
    let grade = 'C';
    if (impactScore >= 50 || p.runs >= 50 || p.wickets >= 3) grade = 'A+';
    else if (impactScore >= 35 || p.runs >= 35 || p.wickets >= 2) grade = 'A';
    else if (impactScore >= 22 || p.runs >= 20 || p.wickets >= 1) grade = 'B+';
    else if (impactScore >= 12 || p.runs >= 10) grade = 'B';

    return {
      ...p,
      strikeRate,
      overs,
      economy,
      impactScore,
      grade,
      summaryText: `${p.runs > 0 ? `${p.runs} (${p.balls}b)` : ''}${p.runs > 0 && p.wickets > 0 ? ' & ' : ''}${p.bowlingBalls > 0 ? `${p.wickets}/${p.runsConceded} (${overs} ov)` : ''}`,
    };
  });

  // Sort by impact score
  performances.sort((a, b) => b.impactScore - a.impactScore);

  // Determine Awards
  const playerOfTheMatch = performances.length > 0 ? performances[0] : null;

  // Best Batter (highest runs, tiebreaker higher SR)
  const battersSorted = [...performances].filter((p) => p.runs > 0).sort((a, b) => {
    if (b.runs !== a.runs) return b.runs - a.runs;
    return parseFloat(b.strikeRate) - parseFloat(a.strikeRate);
  });
  const bestBatter = battersSorted.length > 0 ? battersSorted[0] : null;

  // Best Bowler (most wickets, tiebreaker lower economy)
  const bowlersSorted = [...performances].filter((p) => p.bowlingBalls > 0 && p.wickets > 0).sort((a, b) => {
    if (b.wickets !== a.wickets) return b.wickets - a.wickets;
    return parseFloat(a.economy) - parseFloat(b.economy);
  });
  const bestBowler = bowlersSorted.length > 0 ? bowlersSorted[0] : null;

  return {
    performances,
    awards: {
      playerOfTheMatch,
      bestBatter,
      bestBowler,
    },
  };
}

/**
 * Aggregates tournament-wide leaders, podium, and awards
 */
function calculateTournamentLeaders(tournament) {
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
}

module.exports = {
  oversString,
  srString,
  econString,
  crrString,
  rrrString,
  createEmptyInnings,
  processBallEvent,
  undoLastBall,
  calculateMatchPerformances,
  calculateTournamentLeaders,
};

