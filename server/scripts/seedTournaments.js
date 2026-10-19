/**
 * DEVELOPMENT SEED SCRIPT: seedTournaments.js
 * 
 * Clearly marked development-only seed script for realistic tournament data.
 * Populates:
 * 1. `tournaments` collection (upcoming, live, and completed tournaments)
 * 2. `matches` collection (live ball-by-ball scorecards, completed match results)
 * 3. Linked turfs and vendors
 * 
 * Reuses live scorecard data (toss, runs, wickets, overs, result) by linking each fixture
 * to the `matches` collection.
 * 
 * Run with: node scripts/seedTournaments.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const firestoreService = require('../services/firestoreService');
const cacheService = require('../services/cacheService');

async function seed() {
  console.log('🌱 [DEV SEED] Starting Tournament & Live Matches Seeding...');

  // 1. Seed Realistic Turf Venues
  const sampleTurfs = {
    turf_arena_01: {
      id: 'turf_arena_01',
      name: 'Marina Waves Turf Arena',
      city: 'Chennai',
      location: {
        address: 'No. 42, Beach Road, Santhome, Chennai - 600004',
        lat: 13.0336,
        lng: 80.2785,
      },
      sports: ['Cricket', 'Football'],
      pricePerHour: 1400,
      courtCount: 3,
      status: 'active',
      images: [
        'https://images.unsplash.com/photo-1529900241451-b892a05cf446?auto=format&fit=crop&w=800&q=80',
      ],
      createdAt: new Date().toISOString(),
    },
    turf_velachery_02: {
      id: 'turf_velachery_02',
      name: 'Velachery Sports Hub & Arena',
      city: 'Chennai',
      location: {
        address: '15 Bypass Road, Velachery, Chennai - 600042',
        lat: 12.9756,
        lng: 80.2212,
      },
      sports: ['Cricket', 'Football', 'Badminton'],
      pricePerHour: 1200,
      courtCount: 2,
      status: 'active',
      images: [
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
      ],
      createdAt: new Date().toISOString(),
    },
    turf_omr_03: {
      id: 'turf_omr_03',
      name: 'OMR Champions Arena',
      city: 'Chennai',
      location: {
        address: 'Plot 88, IT Expressway, Sholinganallur, Chennai - 600119',
        lat: 12.9010,
        lng: 80.2279,
      },
      sports: ['Cricket', 'Football'],
      pricePerHour: 1600,
      courtCount: 4,
      status: 'active',
      images: [
        'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
      ],
      createdAt: new Date().toISOString(),
    },
  };

  for (const [id, data] of Object.entries(sampleTurfs)) {
    await firestoreService.setDoc('turfs', id, data);
  }
  console.log('✅ Turfs seeded');

  // 2. Seed Realistic Turf Vendors
  const sampleVendors = {
    vendor_chennai_sports: {
      id: 'vendor_chennai_sports',
      name: 'Karthik Sports Management',
      email: 'karthik@chennaisports.in',
      phone: '+91 98401 23456',
      kycStatus: 'approved',
      createdAt: new Date().toISOString(),
    },
    vendor_marina_host: {
      id: 'vendor_marina_host',
      name: 'Marina Turf Hospitality Ltd',
      email: 'events@marinaturf.com',
      phone: '+91 98840 98765',
      kycStatus: 'approved',
      createdAt: new Date().toISOString(),
    },
  };

  for (const [id, data] of Object.entries(sampleVendors)) {
    await firestoreService.setDoc('vendors', id, data);
  }
  console.log('✅ Vendors seeded');

  // 3. Seed Existing `matches` collection items (Linked to tournament fixtures)
  // These matches provide the real live scorecard & results without duplication!
  const sampleMatches = {
    // Live Match 1: CSL Live Cricket Match
    match_live_csl_101: {
      id: 'match_live_csl_101',
      sport: 'Cricket',
      place: 'Marina Waves Turf Arena - Court 1',
      status: 'live',
      createdBy: 'user_admin_zuna_com',
      creatorName: 'Tournament Director',
      joinCode: 'CSL001',
      matchDate: new Date().toISOString().slice(0, 10),
      matchTime: '18:30',
      teams: {
        teamA: {
          id: 'team_csl_strikers',
          name: 'Chennai Strikers',
          captain: 'Dinesh Karthik',
        },
        teamB: {
          id: 'team_csl_warriors',
          name: 'Besant Warriors',
          captain: 'Murali Vijay',
        },
      },
      toss: {
        wonBy: 'Chennai Strikers',
        decision: 'batted first',
        elected: 'bat',
      },
      scorecard: {
        currentInning: 1,
        battingTeam: 'Chennai Strikers',
        bowlingTeam: 'Besant Warriors',
        runs: 148,
        wickets: 4,
        overs: 16.4,
        balls: 100,
        target: null,
        striker: 'R. Ashwin (42* off 26b, 3x4, 2x6)',
        nonStriker: 'S. Badrinath (18* off 14b, 2x4)',
        bowler: 'S. Thakur (3.4-0-28-2)',
        recentBalls: ['1', '4', '0', '6', 'W', '2'],
        requiredRuns: null,
        remainingBalls: null,
        innings: [
          {
            inningNumber: 1,
            battingTeam: 'Chennai Strikers',
            runs: 148,
            wickets: 4,
            overs: 16.4,
          },
        ],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },

    // Live Match 2: Metro Futsal Live Football Match
    match_live_futsal_201: {
      id: 'match_live_futsal_201',
      sport: 'Football',
      place: 'Velachery Sports Hub & Arena - Pitch 2',
      status: 'live',
      createdBy: 'user_admin_zuna_com',
      creatorName: 'Futsal League Admin',
      joinCode: 'FUT002',
      matchDate: new Date().toISOString().slice(0, 10),
      matchTime: '19:00',
      teams: {
        teamA: {
          id: 'team_velachery_fc',
          name: 'Velachery Wolves FC',
          captain: 'Arun Kumar',
        },
        teamB: {
          id: 'team_t_nagar_fc',
          name: 'T. Nagar Titans',
          captain: 'Vikram Seth',
        },
      },
      toss: {
        wonBy: 'Velachery Wolves FC',
        decision: 'chose left side',
      },
      scorecard: {
        battingTeam: 'Velachery Wolves FC',
        bowlingTeam: 'T. Nagar Titans',
        runs: 3,
        wickets: 2,
        overs: 68, // Minute 68
        football: {
          half: 'Second Half',
          minute: 68,
          scoreA: 3,
          scoreB: 2,
          scorers: [
            'Arun Kumar (14\', 42\')',
            'Vikram Seth (28\')',
            'K. Rohit (53\')',
            'V. Suresh (61\')',
          ],
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },

    // Completed Match 1 (Final of Winter Champions Trophy)
    match_hist_csl_final: {
      id: 'match_hist_csl_final',
      sport: 'Cricket',
      place: 'Marina Waves Turf Arena - Main Ground',
      status: 'completed',
      createdBy: 'user_admin_zuna_com',
      creatorName: 'Super Admin',
      joinCode: 'FIN999',
      matchDate: '2025-12-28',
      matchTime: '18:00',
      teams: {
        teamA: {
          id: 'team_marina_blasters',
          name: 'Marina Blasters',
        },
        teamB: {
          id: 'team_besant_hawks',
          name: 'Besant Hawks',
        },
      },
      toss: {
        wonBy: 'Marina Blasters',
        decision: 'elected to bat',
      },
      scorecard: {
        runs: 174,
        wickets: 6,
        overs: 20.0,
        result: 'Marina Blasters won by 13 runs',
        resultText: 'Marina Blasters won by 13 runs',
        innings: [
          {
            inningNumber: 1,
            battingTeam: 'Marina Blasters',
            runs: 174,
            wickets: 6,
            overs: 20.0,
          },
          {
            inningNumber: 2,
            battingTeam: 'Besant Hawks',
            runs: 161,
            wickets: 8,
            overs: 20.0,
          },
        ],
      },
      createdAt: '2025-12-28T18:00:00.000Z',
      updatedAt: '2025-12-28T22:30:00.000Z',
    },

    // Completed Semifinal 1
    match_hist_csl_semi1: {
      id: 'match_hist_csl_semi1',
      sport: 'Cricket',
      place: 'Marina Waves Turf Arena',
      status: 'completed',
      createdBy: 'user_admin_zuna_com',
      creatorName: 'Super Admin',
      joinCode: 'SEM001',
      matchDate: '2025-12-26',
      matchTime: '16:00',
      teams: {
        teamA: { id: 'team_marina_blasters', name: 'Marina Blasters' },
        teamB: { id: 'team_omr_kings', name: 'OMR Super Kings' },
      },
      toss: { wonBy: 'OMR Super Kings', decision: 'chose to bowl' },
      scorecard: {
        runs: 182,
        wickets: 4,
        overs: 20.0,
        result: 'Marina Blasters won by 24 runs',
        resultText: 'Marina Blasters won by 24 runs',
        innings: [
          { inningNumber: 1, battingTeam: 'Marina Blasters', runs: 182, wickets: 4, overs: 20.0 },
          { inningNumber: 2, battingTeam: 'OMR Super Kings', runs: 158, wickets: 7, overs: 20.0 },
        ],
      },
      createdAt: '2025-12-26T16:00:00.000Z',
    },

    // Completed Semifinal 2
    match_hist_csl_semi2: {
      id: 'match_hist_csl_semi2',
      sport: 'Cricket',
      place: 'Marina Waves Turf Arena',
      status: 'completed',
      createdBy: 'user_admin_zuna_com',
      creatorName: 'Super Admin',
      joinCode: 'SEM002',
      matchDate: '2025-12-27',
      matchTime: '16:00',
      teams: {
        teamA: { id: 'team_besant_hawks', name: 'Besant Hawks' },
        teamB: { id: 'team_mylapore_tigers', name: 'Mylapore Tigers' },
      },
      toss: { wonBy: 'Besant Hawks', decision: 'chose to bat' },
      scorecard: {
        runs: 165,
        wickets: 5,
        overs: 20.0,
        result: 'Besant Hawks won by 6 wickets',
        resultText: 'Besant Hawks won by 6 wickets',
        innings: [
          { inningNumber: 1, battingTeam: 'Mylapore Tigers', runs: 163, wickets: 8, overs: 20.0 },
          { inningNumber: 2, battingTeam: 'Besant Hawks', runs: 165, wickets: 4, overs: 18.2 },
        ],
      },
      createdAt: '2025-12-27T16:00:00.000Z',
    },

    // Pongal Cup Futsal Final Match
    match_hist_pongal_final: {
      id: 'match_hist_pongal_final',
      sport: 'Football',
      place: 'OMR Champions Arena - Court 1',
      status: 'completed',
      createdBy: 'user_admin_zuna_com',
      creatorName: 'Tournament Director',
      joinCode: 'PNG999',
      matchDate: '2026-01-16',
      matchTime: '18:00',
      teams: {
        teamA: { id: 'team_kovai_strikers', name: 'Kovai Strikers' },
        teamB: { id: 'team_madurai_titans', name: 'Madurai Titans' },
      },
      scorecard: {
        runs: 4,
        wickets: 2,
        result: 'Kovai Strikers won 4 - 2 in Full Time',
        resultText: 'Kovai Strikers won 4 - 2 in Full Time',
        football: {
          scoreA: 4,
          scoreB: 2,
          scorers: ['P. Karthi (11\', 34\')', 'S. Vignesh (48\')', 'M. Imran (70\')'],
        },
      },
      createdAt: '2026-01-16T18:00:00.000Z',
    },

    // Scheduled upcoming match 1
    match_upc_tn_01: {
      id: 'match_upc_tn_01',
      sport: 'Cricket',
      place: 'Velachery Sports Hub & Arena',
      status: 'created',
      createdBy: 'user_admin_zuna_com',
      creatorName: 'Admin',
      joinCode: 'UPC101',
      matchDate: '2026-11-05',
      matchTime: '09:00',
      teams: {
        teamA: { id: 'team_tn_dragons', name: 'Tamil Dragons' },
        teamB: { id: 'team_tn_knights', name: 'Coimbatore Knights' },
      },
      scorecard: { runs: 0, wickets: 0, overs: 0 },
      createdAt: new Date().toISOString(),
    },
  };

  for (const [id, data] of Object.entries(sampleMatches)) {
    await firestoreService.setDoc('matches', id, data);
  }
  console.log('✅ Matches seeded with linked scorecard records');

  // 4. Seed Realistic Tournaments into `tournaments` collection
  const sampleTournaments = {
    // -------------------------------------------------------------
    // TOURNAMENT 1: LIVE NOW (Cricket)
    // -------------------------------------------------------------
    trnt_live_csl_2026: {
      id: 'trnt_live_csl_2026',
      name: 'Chennai Super League 2026 (Live T20)',
      sport: 'Cricket',
      turfId: 'turf_arena_01',
      vendorId: 'vendor_marina_host',
      startDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      status: 'live',
      teams: [
        {
          teamId: 'team_csl_strikers',
          name: 'Chennai Strikers',
          captainUserId: 'usr_csl_capt_01',
          captain: {
            name: 'Dinesh Karthik',
            phone: '+91 98401 11223',
            email: 'dk@chennaistrikers.in',
          },
          players: [
            { id: 'p_01', name: 'Dinesh Karthik', role: 'Captain / Wicketkeeper', phone: '+91 98401 11223' },
            { id: 'p_02', name: 'R. Ashwin', role: 'All-Rounder', phone: '+91 98401 11224' },
            { id: 'p_03', name: 'S. Badrinath', role: 'Top-Order Batsman', phone: '+91 98401 11225' },
            { id: 'p_04', name: 'V. Shankar', role: 'Fast Bowler', phone: '+91 98401 11226' },
            { id: 'p_05', name: 'M. Ashwin', role: 'Leg Spinner', phone: '+91 98401 11227' },
          ],
        },
        {
          teamId: 'team_csl_warriors',
          name: 'Besant Warriors',
          captainUserId: 'usr_csl_capt_02',
          captain: {
            name: 'Murali Vijay',
            phone: '+91 98402 22334',
            email: 'murali@besantwarriors.in',
          },
          players: [
            { id: 'p_06', name: 'Murali Vijay', role: 'Captain / Opening Batsman', phone: '+91 98402 22334' },
            { id: 'p_07', name: 'S. Thakur', role: 'All-Rounder', phone: '+91 98402 22335' },
            { id: 'p_08', name: 'K. Vignesh', role: 'Medium Pacer', phone: '+91 98402 22336' },
            { id: 'p_09', name: 'R. Sanjay', role: 'Middle Order', phone: '+91 98402 22337' },
            { id: 'p_10', name: 'N. Jagadeesan', role: 'Wicketkeeper', phone: '+91 98402 22338' },
          ],
        },
        {
          teamId: 'team_omr_kings',
          name: 'OMR Super Kings',
          captainUserId: 'usr_csl_capt_03',
          captain: {
            name: 'P. Balaji',
            phone: '+91 98403 33445',
            email: 'balaji@omrkings.in',
          },
          players: [
            { id: 'p_11', name: 'P. Balaji', role: 'Captain / Bowler', phone: '+91 98403 33445' },
            { id: 'p_12', name: 'K. Rahul', role: 'Batsman', phone: '+91 98403 33446' },
            { id: 'p_13', name: 'G. Prasanna', role: 'All-Rounder', phone: '+91 98403 33447' },
          ],
        },
      ],
      fixtures: [
        {
          id: 'fix_csl_live_01',
          matchId: 'match_live_csl_101',
          teamA: { teamId: 'team_csl_strikers', name: 'Chennai Strikers' },
          teamB: { teamId: 'team_csl_warriors', name: 'Besant Warriors' },
          scheduledAt: new Date().toISOString(),
          status: 'live',
        },
        {
          id: 'fix_csl_upc_02',
          matchId: 'match_upc_tn_01',
          teamA: { teamId: 'team_omr_kings', name: 'OMR Super Kings' },
          teamB: { teamId: 'team_csl_strikers', name: 'Chennai Strikers' },
          scheduledAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          status: 'scheduled',
        },
      ],
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    },

    // -------------------------------------------------------------
    // TOURNAMENT 2: LIVE NOW (Football)
    // -------------------------------------------------------------
    trnt_live_futsal_2026: {
      id: 'trnt_live_futsal_2026',
      name: 'Metro Futsal Championship 2026 (Live)',
      sport: 'Football',
      turfId: 'turf_velachery_02',
      vendorId: 'vendor_chennai_sports',
      startDate: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      status: 'live',
      teams: [
        {
          teamId: 'team_velachery_fc',
          name: 'Velachery Wolves FC',
          captainUserId: 'usr_futsal_capt_01',
          captain: {
            name: 'Arun Kumar',
            phone: '+91 98405 55667',
            email: 'arun@velacheryfc.org',
          },
          players: [
            { id: 'fp_01', name: 'Arun Kumar', role: 'Forward / Captain', phone: '+91 98405 55667' },
            { id: 'fp_02', name: 'K. Rohit', role: 'Midfielder', phone: '+91 98405 55668' },
            { id: 'fp_03', name: 'S. Jeeva', role: 'Defender', phone: '+91 98405 55669' },
            { id: 'fp_04', name: 'M. Naveen', role: 'Goalkeeper', phone: '+91 98405 55670' },
          ],
        },
        {
          teamId: 'team_t_nagar_fc',
          name: 'T. Nagar Titans',
          captainUserId: 'usr_futsal_capt_02',
          captain: {
            name: 'Vikram Seth',
            phone: '+91 98406 66778',
            email: 'vikram@tnagartitans.com',
          },
          players: [
            { id: 'fp_05', name: 'Vikram Seth', role: 'Striker / Captain', phone: '+91 98406 66778' },
            { id: 'fp_06', name: 'V. Suresh', role: 'Winger', phone: '+91 98406 66779' },
            { id: 'fp_07', name: 'R. Deepak', role: 'Goalkeeper', phone: '+91 98406 66780' },
          ],
        },
      ],
      fixtures: [
        {
          id: 'fix_futsal_live_01',
          matchId: 'match_live_futsal_201',
          teamA: { teamId: 'team_velachery_fc', name: 'Velachery Wolves FC' },
          teamB: { teamId: 'team_t_nagar_fc', name: 'T. Nagar Titans' },
          scheduledAt: new Date().toISOString(),
          status: 'live',
        },
      ],
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    },

    // -------------------------------------------------------------
    // TOURNAMENT 3: UPCOMING (Cricket)
    // -------------------------------------------------------------
    trnt_upc_tamilnadu_2026: {
      id: 'trnt_upc_tamilnadu_2026',
      name: 'Tamil Nadu Premier Turf Trophy 2026',
      sport: 'Cricket',
      turfId: 'turf_omr_03',
      vendorId: 'vendor_chennai_sports',
      startDate: '2026-11-10',
      endDate: '2026-11-20',
      status: 'upcoming',
      teams: [
        {
          teamId: 'team_tn_dragons',
          name: 'Tamil Dragons',
          captainUserId: 'usr_tn_c1',
          captain: {
            name: 'K. Vijay',
            phone: '+91 99401 11001',
            email: 'vijay@tamildragons.com',
          },
          players: [
            { id: 'p_tn_1', name: 'K. Vijay', role: 'Captain', phone: '+91 99401 11001' },
            { id: 'p_tn_2', name: 'M. Hari', role: 'Batsman', phone: '+91 99401 11002' },
            { id: 'p_tn_3', name: 'S. Mani', role: 'Bowler', phone: '+91 99401 11003' },
            { id: 'p_tn_4', name: 'R. Karthi', role: 'All-Rounder', phone: '+91 99401 11004' },
          ],
        },
        {
          teamId: 'team_tn_knights',
          name: 'Coimbatore Knights',
          captainUserId: 'usr_tn_c2',
          captain: {
            name: 'P. Anand',
            phone: '+91 99402 22002',
            email: 'anand@coimbatoreknights.in',
          },
          players: [
            { id: 'p_tn_5', name: 'P. Anand', role: 'Captain', phone: '+91 99402 22002' },
            { id: 'p_tn_6', name: 'V. Prakash', role: 'Bowler', phone: '+91 99402 22005' },
            { id: 'p_tn_7', name: 'L. Sivakumar', role: 'Batsman', phone: '+91 99402 22006' },
          ],
        },
        {
          teamId: 'team_madurai_panthers',
          name: 'Madurai Panthers',
          captainUserId: 'usr_tn_c3',
          captain: {
            name: 'C. Saravanan',
            phone: '+91 99403 33003',
            email: 'saravanan@maduraipanthers.in',
          },
          players: [
            { id: 'p_tn_8', name: 'C. Saravanan', role: 'Captain', phone: '+91 99403 33003' },
            { id: 'p_tn_9', name: 'T. Muthu', role: 'All-Rounder', phone: '+91 99403 33007' },
          ],
        },
      ],
      fixtures: [
        {
          id: 'fix_tn_01',
          matchId: 'match_upc_tn_01',
          teamA: { teamId: 'team_tn_dragons', name: 'Tamil Dragons' },
          teamB: { teamId: 'team_tn_knights', name: 'Coimbatore Knights' },
          scheduledAt: '2026-11-10T09:00:00.000Z',
          status: 'scheduled',
        },
        {
          id: 'fix_tn_02',
          matchId: 'match_upc_tn_02',
          teamA: { teamId: 'team_madurai_panthers', name: 'Madurai Panthers' },
          teamB: { teamId: 'team_tn_dragons', name: 'Tamil Dragons' },
          scheduledAt: '2026-11-11T14:30:00.000Z',
          status: 'scheduled',
        },
      ],
      createdAt: '2026-10-01T10:00:00.000Z',
    },

    // -------------------------------------------------------------
    // TOURNAMENT 4: COMPLETED (Cricket)
    // -------------------------------------------------------------
    trnt_comp_winter_cup_2025: {
      id: 'trnt_comp_winter_cup_2025',
      name: 'Madras Winter Champions Cup 2025',
      sport: 'Cricket',
      turfId: 'turf_arena_01',
      vendorId: 'vendor_marina_host',
      startDate: '2025-12-20',
      endDate: '2025-12-28',
      status: 'completed',
      winner: 'Marina Blasters',
      runnerUp: 'Besant Hawks',
      finalScore: '174/6 (20.0) vs 161/8 (20.0)',
      teams: [
        {
          teamId: 'team_marina_blasters',
          name: 'Marina Blasters',
          captainUserId: 'usr_csl_capt_01',
          captain: { name: 'Dinesh Karthik', phone: '+91 98401 11223' },
          players: [
            { id: 'p_01', name: 'Dinesh Karthik', role: 'Captain' },
            { id: 'p_02', name: 'R. Ashwin', role: 'All-Rounder' },
            { id: 'p_03', name: 'S. Badrinath', role: 'Batsman' },
          ],
        },
        {
          teamId: 'team_besant_hawks',
          name: 'Besant Hawks',
          captainUserId: 'usr_csl_capt_02',
          captain: { name: 'Murali Vijay', phone: '+91 98402 22334' },
          players: [
            { id: 'p_06', name: 'Murali Vijay', role: 'Captain' },
            { id: 'p_07', name: 'S. Thakur', role: 'All-Rounder' },
          ],
        },
        {
          teamId: 'team_omr_kings',
          name: 'OMR Super Kings',
          captainUserId: 'usr_csl_capt_03',
          captain: { name: 'P. Balaji', phone: '+91 98403 33445' },
          players: [{ id: 'p_11', name: 'P. Balaji', role: 'Captain' }],
        },
        {
          teamId: 'team_mylapore_tigers',
          name: 'Mylapore Tigers',
          captainUserId: 'usr_csl_capt_04',
          captain: { name: 'S. Anirudha', phone: '+91 98404 44556' },
          players: [{ id: 'p_14', name: 'S. Anirudha', role: 'Captain' }],
        },
      ],
      fixtures: [
        {
          id: 'fix_winter_semi_1',
          matchId: 'match_hist_csl_semi1',
          teamA: { teamId: 'team_marina_blasters', name: 'Marina Blasters' },
          teamB: { teamId: 'team_omr_kings', name: 'OMR Super Kings' },
          scheduledAt: '2025-12-26T16:00:00.000Z',
          status: 'completed',
          result: 'Marina Blasters won by 24 runs',
          winnerId: 'team_marina_blasters',
          winnerName: 'Marina Blasters',
        },
        {
          id: 'fix_winter_semi_2',
          matchId: 'match_hist_csl_semi2',
          teamA: { teamId: 'team_besant_hawks', name: 'Besant Hawks' },
          teamB: { teamId: 'team_mylapore_tigers', name: 'Mylapore Tigers' },
          scheduledAt: '2025-12-27T16:00:00.000Z',
          status: 'completed',
          result: 'Besant Hawks won by 6 wickets',
          winnerId: 'team_besant_hawks',
          winnerName: 'Besant Hawks',
        },
        {
          id: 'fix_winter_final',
          matchId: 'match_hist_csl_final',
          teamA: { teamId: 'team_marina_blasters', name: 'Marina Blasters' },
          teamB: { teamId: 'team_besant_hawks', name: 'Besant Hawks' },
          scheduledAt: '2025-12-28T18:00:00.000Z',
          status: 'completed',
          result: 'Marina Blasters won by 13 runs',
          winnerId: 'team_marina_blasters',
          winnerName: 'Marina Blasters',
        },
      ],
      createdAt: '2025-12-01T10:00:00.000Z',
    },

    // -------------------------------------------------------------
    // TOURNAMENT 5: COMPLETED (Football)
    // -------------------------------------------------------------
    trnt_comp_pongal_cup_2026: {
      id: 'trnt_comp_pongal_cup_2026',
      name: 'Pongal Invitational Futsal Cup 2026',
      sport: 'Football',
      turfId: 'turf_omr_03',
      vendorId: 'vendor_chennai_sports',
      startDate: '2026-01-14',
      endDate: '2026-01-16',
      status: 'completed',
      winner: 'Kovai Strikers',
      runnerUp: 'Madurai Titans',
      finalScore: '4 - 2 (Full Time)',
      teams: [
        {
          teamId: 'team_kovai_strikers',
          name: 'Kovai Strikers',
          captainUserId: 'usr_futsal_c1',
          captain: { name: 'P. Karthi', phone: '+91 99407 77889' },
          players: [
            { id: 'f_01', name: 'P. Karthi', role: 'Captain' },
            { id: 'f_02', name: 'S. Vignesh', role: 'Midfielder' },
          ],
        },
        {
          teamId: 'team_madurai_titans',
          name: 'Madurai Titans',
          captainUserId: 'usr_futsal_c2',
          captain: { name: 'M. Imran', phone: '+91 99408 88990' },
          players: [
            { id: 'f_03', name: 'M. Imran', role: 'Captain' },
            { id: 'f_04', name: 'K. Syed', role: 'Goalkeeper' },
          ],
        },
      ],
      fixtures: [
        {
          id: 'fix_pongal_final',
          matchId: 'match_hist_pongal_final',
          teamA: { teamId: 'team_kovai_strikers', name: 'Kovai Strikers' },
          teamB: { teamId: 'team_madurai_titans', name: 'Madurai Titans' },
          scheduledAt: '2026-01-16T18:00:00.000Z',
          status: 'completed',
          result: 'Kovai Strikers won 4 - 2',
          winnerId: 'team_kovai_strikers',
          winnerName: 'Kovai Strikers',
        },
      ],
      createdAt: '2026-01-02T10:00:00.000Z',
    },
  };

  for (const [id, data] of Object.entries(sampleTournaments)) {
    await firestoreService.setDoc('tournaments', id, data);
  }
  console.log('✅ Tournaments seeded successfully!');

  // 5. Invalidate admin cache so fresh seed appears instantly
  await cacheService.invalidatePattern('admin:tournaments:*');
  console.log('🧹 Cache invalidated.');

  console.log('\n🎉 [DEV SEED COMPLETED] Summary:');
  console.log(' - Live Tournaments: 2 (CSL Live T20, Metro Futsal)');
  console.log(' - Upcoming Tournaments: 1 (TN Premier Turf Trophy)');
  console.log(' - Completed Tournaments: 2 (Winter Champions Cup, Pongal Futsal Cup)');
  console.log(' - Live Matches: 2 (Real-time live cricket & football scorecards)');
  console.log(' - Linked Fixtures: Fully connected to matches collection!\n');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
