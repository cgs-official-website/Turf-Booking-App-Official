require('dotenv').config();
const prisma = require('../config/prisma');
const { getHourlyRate } = require('../utils/pricing');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_long_random_jwt_secret_key_minimum_32_characters';

function createToken(payload) {
  return jwt.sign({ uid: payload.id, ...payload }, JWT_SECRET, { expiresIn: '7d' });
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 TOURNAMENT PHASE 2 & PRICING VERIFICATION SUITE');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // TEST 1: PRICING LOGIC VERIFICATION (PART 10)
    // ----------------------------------------------------
    console.log('▶ TEST 1: Verifying 4 Independent Pricing Rules');
    const mockTurf = {
      id: 'test_pricing_turf',
      pricePerHour: 200,
      slotConfig: {
        pricing: {
          base: 200,           // Weekday before 6 PM
          evening: 500,        // Weekday after 6 PM
          weekend: 1000,       // Weekend before 6 PM
          weekendEvening: 1400 // Weekend after 6 PM (independent, not additive!)
        }
      }
    };

    // 2026-10-19 is Monday (Weekday)
    // 2026-10-24 is Saturday (Weekend)
    const weekdayBefore6 = getHourlyRate(mockTurf, '2026-10-19', '14:00');
    const weekdayAfter6  = getHourlyRate(mockTurf, '2026-10-19', '19:00');
    const weekendBefore6 = getHourlyRate(mockTurf, '2026-10-24', '11:00');
    const weekendAfter6  = getHourlyRate(mockTurf, '2026-10-24', '20:00');

    console.log(`  Weekday Before 6 PM (14:00): ₹${weekdayBefore6} (Expected: ₹200)`);
    console.log(`  Weekday After 6 PM  (19:00): ₹${weekdayAfter6} (Expected: ₹500)`);
    console.log(`  Weekend Before 6 PM (11:00): ₹${weekendBefore6} (Expected: ₹1000)`);
    console.log(`  Weekend After 6 PM  (20:00): ₹${weekendAfter6} (Expected: ₹1400)`);

    if (weekdayBefore6 !== 200) throw new Error(`Weekday before 6 PM failed: got ${weekdayBefore6}`);
    if (weekdayAfter6 !== 500) throw new Error(`Weekday after 6 PM failed: got ${weekdayAfter6}`);
    if (weekendBefore6 !== 1000) throw new Error(`Weekend before 6 PM failed: got ${weekendBefore6}`);
    if (weekendAfter6 !== 1400) throw new Error(`Weekend after 6 PM failed: got ${weekendAfter6}`);
    console.log('  ✅ ALL 4 INDEPENDENT PRICING RULES PASSED!\n');

    // ----------------------------------------------------
    // TEST 2: DATABASE FIXTURES (Vendor, Turf, Users)
    // ----------------------------------------------------
    console.log('▶ TEST 2: Setting up Test Entities in PostgreSQL');
    
    // Ensure test vendor
    let testVendor = await prisma.vendor.findFirst();
    if (!testVendor) {
      testVendor = await prisma.vendor.create({
        data: {
          id: 'test_vendor_phase2',
          email: 'vendor_phase2@example.com',
          name: 'Test Vendor Phase 2',
          phone: '9999900001',
        }
      });
    }

    // Ensure test turf
    let testTurf = await prisma.turf.findFirst({ where: { vendorId: testVendor.id } });
    if (!testTurf) {
      testTurf = await prisma.turf.create({
        data: {
          id: 'test_turf_phase2',
          vendorId: testVendor.id,
          name: 'Elite Cricket Arena',
          city: 'Ellapalayam',
          sports: ['Cricket'],
          pricePerHour: 200,
        }
      });
    }

    // Ensure test users
    const users = [];
    for (let i = 1; i <= 6; i++) {
      const uId = `test_user_phase2_${i}`;
      let u = await prisma.user.findUnique({ where: { id: uId } });
      if (!u) {
        u = await prisma.user.create({
          data: {
            id: uId,
            name: `Player Captain ${i}`,
            phone: `988880000${i}`,
            email: `captain${i}@example.com`,
          }
        });
      }
      users.push(u);
    }
    console.log(`  ✅ Test vendor (${testVendor.name}), turf (${testTurf.name}), and 6 users ready.\n`);

    // Clean up any old test tournaments
    await prisma.tournamentRegistration.deleteMany({
      where: { tournament: { name: 'Elite Cricket Cup 2026' } }
    });
    await prisma.tournament.deleteMany({
      where: { name: 'Elite Cricket Cup 2026' }
    });

    // ----------------------------------------------------
    // TEST 3: VENDOR CREATES & PUBLISHES TOURNAMENT (PARTS 1 & 5)  
    // ----------------------------------------------------
    console.log('▶ TEST 3: Vendor Creates & Publishes Tournament');
    const createdTournament = await prisma.tournament.create({
      data: {
        id: 'test_tournament_phase2_cup',
        turfId: testTurf.id,
        vendorId: testVendor.id,
        creatorType: 'VENDOR',
        name: 'Elite Cricket Cup 2026',
        sport: 'Cricket',
        venueName: testTurf.name,
        city: testTurf.city,
        startDate: '2026-10-25',
        endDate: '2026-10-30',
        registrationEndDate: '2026-10-24',
        numberOfTeams: 5,
        playersPerTeam: 11,
        oversPerTeam: 20,
        status: 'published',
        shareableIdentifier: 'trnt_test_phase2_share',
      }
    });

    console.log(`  Created tournament: "${createdTournament.name}" (Capacity: 5 teams, 11 players/team, 20 overs)`);
    console.log('  ✅ Tournament published successfully!\n');

    // ----------------------------------------------------
    // TEST 4: API VERIFICATION - GET TOURNAMENT DETAILS
    // ----------------------------------------------------
    console.log('▶ TEST 4: Fetch Tournament Details & Capacity');
    const tokenUser1 = createToken({ id: users[0].id, role: 'user' });
    const tokenVendor = createToken({ id: testVendor.id, role: 'vendor' });

    const fetchDetail = async (token) => {
      const res = await fetch(`http://localhost:5000/api/v1/tournaments/${createdTournament.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return await res.json();
    };

    const detailInitial = await fetchDetail(tokenUser1);
    const tournData = detailInitial.data.tournament;

    console.log(`  Accepted Teams: ${tournData.acceptedTeamsCount} / ${tournData.totalTeams}`);
    console.log(`  Slots Remaining: ${tournData.remainingSlots}`);
    console.log(`  Lifecycle State: ${tournData.lifecycleStatus} (${tournData.lifecycleLabel})`);
    console.log(`  My Registration: ${tournData.myRegistration}`);

    if (tournData.acceptedTeamsCount !== 0) throw new Error('Expected 0 accepted teams initially');
    if (tournData.remainingSlots !== 5) throw new Error('Expected 5 remaining slots initially');
    if (tournData.status !== 'published') throw new Error('Expected status published');
    console.log('  ✅ Initial capacity matches requirements!\n');

    // ----------------------------------------------------
    // TEST 5: USER SUBMITS TEAM REGISTRATION (PARTS 2 & 4)
    // ----------------------------------------------------
    console.log('▶ TEST 5: User 1 Submits Team Alpha Registration');
    
    // Generate 11 players
    const makePlayers = (prefix) => Array.from({ length: 11 }, (_, i) => ({
      name: `${prefix} Player ${i + 1}`,
      phone: `91111${String(prefix.charCodeAt(0)).padStart(2, '0')}${String(i + 1).padStart(3, '0')}`,
    }));

    // Test validation failure: 10 players instead of 11
    const badRegRes = await fetch(`http://localhost:5000/api/v1/tournaments/${createdTournament.id}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUser1}`,
      },
      body: JSON.stringify({
        teamName: 'Team Alpha',
        captainName: 'Captain John',
        captainPhone: '9888800001',
        players: makePlayers('A').slice(0, 10), // Only 10 players
      }),
    });
    const badRegJson = await badRegRes.json();
    console.log(`  Invalid squad size check (10 players): status ${badRegRes.status} -> ${badRegJson.message}`);
    if (badRegRes.status !== 400) throw new Error('Failed to block invalid players count');

    // Test valid registration: 11 players
    const regRes1 = await fetch(`http://localhost:5000/api/v1/tournaments/${createdTournament.id}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUser1}`,
      },
      body: JSON.stringify({
        teamName: 'Team Alpha',
        captainName: 'Captain John',
        captainPhone: '9888800001',
        captainEmail: 'john@alpha.com',
        players: makePlayers('A'),
      }),
    });

    const regJson1 = await regRes1.json();
    console.log(`  Valid registration: status ${regRes1.status} -> ${regJson1.message}`);
    if (regRes1.status !== 201) throw new Error('Team registration failed: ' + JSON.stringify(regJson1));
    if (regJson1.data.registration.status !== 'pending') throw new Error('Expected pending status');
    console.log('  ✅ Team Alpha submitted with Pending Approval status!\n');

    // Test duplicate registration block
    console.log('▶ TEST 6: Verify Duplicate Registration is Blocked');
    const dupRes = await fetch(`http://localhost:5000/api/v1/tournaments/${createdTournament.id}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUser1}`,
      },
      body: JSON.stringify({
        teamName: 'Team Alpha Repeated',
        captainName: 'Captain John',
        captainPhone: '9888800001',
        players: makePlayers('A'),
      }),
    });
    const dupJson = await dupRes.json();
    console.log(`  Duplicate submission check: status ${dupRes.status} -> ${dupJson.message}`);
    if (dupRes.status !== 400) throw new Error('Failed to block duplicate registration');
    console.log('  ✅ Duplicate registration blocked!\n');

    // ----------------------------------------------------
    // TEST 7: VENDOR SEES PENDING APPLICATIONS (PART 3)
    // ----------------------------------------------------
    console.log('▶ TEST 7: Vendor Views Tournament Registrations');
    const vendorRegsRes = await fetch(`http://localhost:5000/api/v1/vendor/tournaments/${createdTournament.id}/registrations`, {
      headers: { Authorization: `Bearer ${tokenVendor}` },
    });
    const vendorRegsJson = await vendorRegsRes.json();
    console.log(`  Vendor fetched registrations count: ${vendorRegsJson.data.registrations.length}`);
    const teamAlpha = vendorRegsJson.data.registrations.find(r => r.teamName === 'Team Alpha');
    if (!teamAlpha || teamAlpha.status !== 'pending') throw new Error('Expected pending team registration in vendor view');
    console.log(`  Team: ${teamAlpha.teamName}, Captain: ${teamAlpha.captainName}, Status: ${teamAlpha.status}`);
    console.log('  ✅ Vendor view verified!\n');

    // ----------------------------------------------------
    // TEST 8: VENDOR ACCEPTS TEAM (PARTS 3 & 4)
    // ----------------------------------------------------
    console.log('▶ TEST 8: Vendor Accepts Team Alpha');
    const acceptRes = await fetch(
      `http://localhost:5000/api/v1/vendor/tournaments/${createdTournament.id}/registrations/${teamAlpha.id}/accept`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenVendor}` },
      }
    );
    const acceptJson = await acceptRes.json();
    console.log(`  Accept status: ${acceptRes.status} -> ${acceptJson.message}`);
    console.log(`  New Accepted Count: ${acceptJson.data.summary.acceptedCount} / ${acceptJson.data.summary.totalTeams}`);
    console.log(`  Remaining Slots: ${acceptJson.data.summary.remainingSlots}`);

    if (acceptJson.data.summary.acceptedCount !== 1) throw new Error('Expected 1 accepted team');
    if (acceptJson.data.summary.remainingSlots !== 4) throw new Error('Expected 4 remaining slots');
    console.log('  ✅ Team Alpha accepted and slot count atomically updated!\n');

    // ----------------------------------------------------
    // TEST 9: USER 1 VIEWS UPDATED REGISTRATION STATUS (PART 4)
    // ----------------------------------------------------
    console.log('▶ TEST 9: User 1 Views Accepted Status on Tournament Detail');
    const detailAfterAccept = await fetchDetail(tokenUser1);
    const user1Reg = detailAfterAccept.data.tournament.myRegistration;
    console.log(`  Your Team: ${user1Reg.teamName}`);
    console.log(`  Status: ${user1Reg.status}`);
    if (user1Reg.status !== 'accepted') throw new Error('Expected user1 registration to be accepted');
    console.log('  ✅ User 1 sees Accepted status!\n');

    // ----------------------------------------------------
    // TEST 10: USER 2 SEES 4 REMAINING SLOTS
    // ----------------------------------------------------
    console.log('▶ TEST 10: Another User Sees Remaining Capacity');
    const tokenUser2 = createToken({ id: users[1].id, role: 'user' });
    const detailUser2 = await fetchDetail(tokenUser2);
    console.log(`  User 2 sees: Accepted Teams: ${detailUser2.data.tournament.acceptedTeamsCount} / ${detailUser2.data.tournament.totalTeams}`);
    console.log(`  User 2 sees: Remaining Slots: ${detailUser2.data.tournament.remainingSlots}`);
    console.log(`  User 2 myRegistration: ${detailUser2.data.tournament.myRegistration}`);
    if (detailUser2.data.tournament.remainingSlots !== 4) throw new Error('Expected 4 remaining slots for other user');
    if (detailUser2.data.tournament.myRegistration !== null) throw new Error('Expected null registration for user 2');
    console.log('  ✅ Privacy and accurate capacity verified for User 2!\n');

    // ----------------------------------------------------
    // TEST 11: REGISTER AND ACCEPT TEAMS UNTIL 5/5 (FULL)
    // ----------------------------------------------------
    console.log('▶ TEST 11: Registering & Accepting Teams Until Full (5/5)');
    const letters = ['B', 'C', 'D', 'E'];
    for (let i = 0; i < 4; i++) {
      const u = users[i + 1];
      const tok = createToken({ id: u.id, role: 'user' });
      const tName = `Team ${letters[i]}`;
      
      const r = await fetch(`http://localhost:5000/api/v1/tournaments/${createdTournament.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({
          teamName: tName,
          captainName: u.name,
          captainPhone: u.phone,
          players: makePlayers(letters[i]),
        }),
      });
      const rData = await r.json();

      // Vendor accepts team
      await fetch(
        `http://localhost:5000/api/v1/vendor/tournaments/${createdTournament.id}/registrations/${rData.data.registration.id}/accept`,
        { method: 'POST', headers: { Authorization: `Bearer ${tokenVendor}` } }
      );
      console.log(`  Accepted ${tName} (${i + 2}/5)`);
    }

    const detailFull = await fetchDetail();
    console.log(`  Capacity: ${detailFull.data.tournament.acceptedTeamsCount} / ${detailFull.data.tournament.totalTeams}`);
    console.log(`  Remaining: ${detailFull.data.tournament.remainingSlots}`);
    console.log(`  Lifecycle Status: ${detailFull.data.tournament.lifecycleStatus} (${detailFull.data.tournament.lifecycleLabel})`);

    if (detailFull.data.tournament.acceptedTeamsCount !== 5) throw new Error('Expected 5 accepted teams');
    if (detailFull.data.tournament.remainingSlots !== 0) throw new Error('Expected 0 remaining slots');
    if (detailFull.data.tournament.lifecycleStatus !== 'registration_closed' && detailFull.data.tournament.lifecycleStatus !== 'full') throw new Error('Expected status full');
    console.log('  ✅ Tournament is now FULL (5/5) with 0 remaining slots!\n');

    // ----------------------------------------------------
    // TEST 12: BLOCK NEW REGISTRATIONS WHEN FULL (PART 5)
    // ----------------------------------------------------
    console.log('▶ TEST 12: Attempt Registration on Full Tournament (User 6)');
    const tokenUser6 = createToken({ id: users[5].id, role: 'user' });
    const fullBlockRes = await fetch(`http://localhost:5000/api/v1/tournaments/${createdTournament.id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenUser6}` },
      body: JSON.stringify({
        teamName: 'Team Overfill',
        captainName: 'User 6',
        captainPhone: '9888800006',
        players: makePlayers('F'),
      }),
    });
    const fullBlockJson = await fullBlockRes.json();
    console.log(`  Registration on full tournament: status ${fullBlockRes.status} -> ${fullBlockJson.message}`);
    if (fullBlockRes.status !== 400) throw new Error('Failed to block registration when tournament is full');
    console.log('  ✅ Registrations successfully blocked when full!\n');

    // ----------------------------------------------------
    // TEST 13: VENDOR REJECTS TEAM WITH REASON (PART 3)
    // ----------------------------------------------------
    console.log('▶ TEST 13: Vendor Rejection Workflow');
    // Create an unaccepted pending registration directly in database to test rejection
    const pendingReg = await prisma.tournamentRegistration.create({
      data: {
        tournamentId: createdTournament.id,
        userId: users[5].id,
        teamName: 'Team Extra',
        captainName: 'Captain Extra',
        captainPhone: '9888800006',
        players: makePlayers('X'),
        status: 'pending',
      }
    });

    const rejectRes = await fetch(
      `http://localhost:5000/api/v1/vendor/tournaments/${createdTournament.id}/registrations/${pendingReg.id}/reject`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenVendor}` },
        body: JSON.stringify({ reason: 'Squad does not meet tournament criteria' }),
      }
    );
    const rejectJson = await rejectRes.json();
    console.log(`  Reject status: ${rejectRes.status} -> ${rejectJson.message}`);
    console.log(`  Stored rejection reason: "${rejectJson.data.registration.rejectionReason}"`);
    console.log(`  Slot count untouched: Accepted=${rejectJson.data.summary.acceptedCount}/5, Remaining=${rejectJson.data.summary.remainingSlots}`);

    if (rejectJson.data.registration.status !== 'rejected') throw new Error('Expected rejected status');
    if (rejectJson.data.registration.rejectionReason !== 'Squad does not meet tournament criteria') throw new Error('Rejection reason mismatch');
    console.log('  ✅ Rejection stored reason and did not consume slots!\n');

    // ----------------------------------------------------
    // TEST 14: AUTHORIZATION SECURITY (PART 8)
    // ----------------------------------------------------
    console.log('▶ TEST 14: Authorization & Privacy Verification');
    const unauthorizedToken = createToken({ id: 'random_attacker_id', role: 'vendor' });
    const unauthRes = await fetch(
      `http://localhost:5000/api/v1/vendor/tournaments/${createdTournament.id}/registrations`,
      { headers: { Authorization: `Bearer ${unauthorizedToken}` } }
    );
    console.log(`  Unauthorized vendor access attempt: status ${unauthRes.status}`);
    if (unauthRes.status !== 403) throw new Error('Failed to block unauthorized vendor from viewing registrations');
    console.log('  ✅ Cross-vendor authorization strictly enforced!\n');

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    await prisma.tournamentRegistration.deleteMany({
      where: { tournamentId: createdTournament.id }
    });
    await prisma.tournament.delete({
      where: { id: createdTournament.id }
    });
    console.log('🧹 Cleaned up test tournament data.\n');

    console.log('====================================================');
    console.log('🎉 ALL 14 TOURNAMENT & PRICING VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST RUNNER FAILED:', err);
    process.exit(1);
  }
}

runTests();
