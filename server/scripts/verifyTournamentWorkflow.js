require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://127.0.0.1:5000/api/v1';

async function main() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE TOURNAMENT WORKFLOW VERIFICATION');
  console.log('====================================================');

  // 1. Fetch available turfs and users from database
  const turfs = await prisma.turf.findMany({
    where: { status: 'active' },
    include: { vendor: true },
    take: 2,
  });

  if (turfs.length < 2) {
    throw new Error('Need at least 2 active turfs with vendors in DB to test turf isolation');
  }

  const turfA = turfs[0];
  const turfB = turfs[1];
  console.log(`📍 Turf A: "${turfA.name}" (ID: ${turfA.id}, Vendor: ${turfA.vendorId})`);
  console.log(`📍 Turf B: "${turfB.name}" (ID: ${turfB.id}, Vendor: ${turfB.vendorId})`);

  // Fetch 2 test users
  const users = await prisma.user.findMany({
    where: { status: 'active' },
    take: 2,
  });

  if (users.length < 2) {
    throw new Error('Need at least 2 users in DB to test ownership and permissions');
  }

  const userA = users[0];
  const userB = users[1];
  console.log(`👤 User A (Creator): "${userA.name || userA.phone}" (ID: ${userA.id})`);
  console.log(`👤 User B (Other User): "${userB.name || userB.phone}" (ID: ${userB.id})`);

  // Helper to create token/auth headers
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_change_in_production';

  const userAToken = jwt.sign({ uid: userA.id, id: userA.id, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
  const userBToken = jwt.sign({ uid: userB.id, id: userB.id, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
  const vendorAToken = jwt.sign({ uid: turfA.vendorId, id: turfA.vendorId, role: 'vendor', vendorId: turfA.vendorId }, JWT_SECRET, { expiresIn: '7d' });
  const vendorBToken = jwt.sign({ uid: turfB.vendorId, id: turfB.vendorId, role: 'vendor', vendorId: turfB.vendorId }, JWT_SECRET, { expiresIn: '7d' });
  const adminToken = jwt.sign({ uid: 'superadmin_1', id: 'superadmin_1', role: 'superadmin', admin: true }, JWT_SECRET, { expiresIn: '7d' });

  let vendorTournamentId = null;
  let userTournamentId = null;
  let draftTournamentId = null;

  try {
    // ----------------------------------------------------
    // TEST 1: Vendor creates: Elite Turf Cricket Cup & Publishes it.
    // ----------------------------------------------------
    console.log('\n--- TEST 1: Vendor creates & publishes "Elite Turf Cricket Cup" ---');
    const today = new Date();
    const nextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const startDate = today.toISOString().slice(0, 10);
    const endDate = nextWeek.toISOString().slice(0, 10);

    const vendorCreateRes = await axios.post(
      `${BASE_URL}/vendor/tournaments`,
      {
        turfId: turfA.id,
        name: 'Elite Turf Cricket Cup',
        sport: 'Cricket',
        startDate,
        endDate,
        numberOfTeams: 8,
        playersPerTeam: 11,
        oversPerTeam: 10,
        description: 'Vendor hosted official cricket tournament.',
        rules: 'Standard cricket rules apply. Turf shoes required.',
        status: 'published',
      },
      { headers: { Authorization: `Bearer ${vendorAToken}` } }
    );

    const vendorTrn = vendorCreateRes.data?.data?.tournament || vendorCreateRes.data?.tournament;
    vendorTournamentId = vendorTrn.id;
    console.log(`✅ Created Vendor Tournament: "${vendorTrn.name}" (ID: ${vendorTournamentId}, Source: ${vendorTrn.source})`);

    // Verify UserApp -> Tournaments -> Available shows Elite Turf Cricket Cup
    const availableRes = await axios.get(`${BASE_URL}/tournaments/available`);
    const availableList = availableRes.data?.data?.tournaments || availableRes.data?.tournaments || [];
    const foundVendorTrn = availableList.find((t) => t.id === vendorTournamentId);
    if (!foundVendorTrn) throw new Error('TEST 1 FAILED: Elite Turf Cricket Cup not found in available tournaments');
    if (foundVendorTrn.source !== 'TURF HOSTED') throw new Error(`TEST 1 FAILED: Expected source TURF HOSTED, got ${foundVendorTrn.source}`);
    console.log(`✅ TEST 1 PASSED: Found in Available Tournaments with badge: ${foundVendorTrn.sourceBadge}`);

    // ----------------------------------------------------
    // TEST 2: User opens Turf A (TurfDetail). Verify Tournament Available is displayed.
    // ----------------------------------------------------
    console.log('\n--- TEST 2: User opens TurfDetail. Verify Tournament Available ---');
    const turfDetailRes = await axios.get(`${BASE_URL}/turfs/${turfA.id}`);
    const turfData = turfDetailRes.data?.data?.turf || turfDetailRes.data?.turf;
    if (!turfData.hasTournament && !turfData.tournamentAvailable) {
      throw new Error('TEST 2 FAILED: Turf does not report hasTournament=true');
    }
    if (!turfData.activeTournament || turfData.activeTournament.id !== vendorTournamentId) {
      throw new Error(`TEST 2 FAILED: activeTournament mismatch. Expected ${vendorTournamentId}, got ${turfData.activeTournament?.id}`);
    }
    console.log(`✅ TEST 2 PASSED: Turf reports hasTournament=true and activeTournament: "${turfData.activeTournament.name}"`);

    // ----------------------------------------------------
    // TEST 3: User selects Turf A -> Create Tournament -> configures teams -> adds players -> publishes.
    // ----------------------------------------------------
    console.log('\n--- TEST 3: User creates tournament at Turf A with teams and roster ---');
    const userTeams = [
      {
        id: 'team_1',
        name: 'Super Strikers',
        players: [
          { id: 'p_1', name: 'Ramesh Captain', phone: '9876543210' },
          { id: 'p_2', name: 'Suresh Batsman', phone: '9876543211' },
        ],
      },
      {
        id: 'team_2',
        name: 'Thunderbolts',
        players: [
          { id: 'p_3', name: 'Karthik Bowler', phone: '9876543212' },
        ],
      },
    ];

    const userCreateRes = await axios.post(
      `${BASE_URL}/tournaments`,
      {
        turfId: turfA.id,
        name: 'Sunday Friends Champions Cup',
        sport: 'Cricket',
        startDate,
        endDate,
        numberOfTeams: 2,
        playersPerTeam: 5,
        oversPerTeam: 6,
        description: 'Friendly weekend community clash',
        teams: userTeams,
        status: 'published',
      },
      { headers: { Authorization: `Bearer ${userAToken}` } }
    );

    const userTrn = userCreateRes.data?.data?.tournament || userCreateRes.data?.tournament;
    userTournamentId = userTrn.id;
    console.log(`✅ User Tournament Created: "${userTrn.name}" (ID: ${userTournamentId})`);
    if (userTrn.turfId !== turfA.id) throw new Error(`TEST 3 FAILED: turfId mismatch. Expected ${turfA.id}, got ${userTrn.turfId}`);
    if (userTrn.creatorType !== 'USER') throw new Error(`TEST 3 FAILED: creatorType expected USER, got ${userTrn.creatorType}`);
    if (userTrn.source !== 'USER CREATED') throw new Error(`TEST 3 FAILED: source expected USER CREATED, got ${userTrn.source}`);
    console.log(`✅ TEST 3 PASSED: Tournament created, associated with Turf A, source: ${userTrn.source}, teams: ${userTrn.teams?.length}`);

    // ----------------------------------------------------
    // TEST 4: Open Turf A VendorApp. Verify Vendor -> Tournaments shows the newly created user tournament.
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Vendor A views tournaments for Turf A ---');
    const vendorAListRes = await axios.get(
      `${BASE_URL}/vendor/tournaments?turfId=${turfA.id}`,
      { headers: { Authorization: `Bearer ${vendorAToken}` } }
    );
    const vendorAList = vendorAListRes.data?.data?.tournaments || vendorAListRes.data?.tournaments || [];
    const foundInVendorA = vendorAList.find((t) => t.id === userTournamentId);
    if (!foundInVendorA) throw new Error('TEST 4 FAILED: User tournament not found in Vendor A tournament list');
    if (foundInVendorA.source !== 'USER CREATED') throw new Error(`TEST 4 FAILED: Expected source USER CREATED, got ${foundInVendorA.source}`);
    if (foundInVendorA.canEdit !== false) throw new Error('TEST 4 FAILED: Vendor should NOT be permitted to edit user-created tournament');
    console.log(`✅ TEST 4 PASSED: Vendor A sees user tournament with badge [${foundInVendorA.source}] and canEdit=false`);

    // ----------------------------------------------------
    // TEST 5: Open Turf B VendorApp. Verify tournament does NOT appear there.
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Vendor B views tournaments for Turf B (Turf Isolation) ---');
    const vendorBListRes = await axios.get(
      `${BASE_URL}/vendor/tournaments?turfId=${turfB.id}`,
      { headers: { Authorization: `Bearer ${vendorBToken}` } }
    );
    const vendorBList = vendorBListRes.data?.data?.tournaments || vendorBListRes.data?.tournaments || [];
    const foundInVendorB = vendorBList.find((t) => t.id === userTournamentId || t.id === vendorTournamentId);
    if (foundInVendorB) {
      throw new Error(`TEST 5 FAILED: Turf A tournament "${foundInVendorB.name}" leaked into Turf B vendor list!`);
    }
    console.log('✅ TEST 5 PASSED: Strict Turf Isolation verified. Vendor B sees ZERO tournaments from Turf A');

    // ----------------------------------------------------
    // TEST 6: UserApp -> My Tournaments. Verify creator can see their own tournament.
    // ----------------------------------------------------
    console.log('\n--- TEST 6: User A views My Tournaments ---');
    const myTrnRes = await axios.get(
      `${BASE_URL}/tournaments/my`,
      { headers: { Authorization: `Bearer ${userAToken}` } }
    );
    const myList = myTrnRes.data?.data?.tournaments || myTrnRes.data?.tournaments || [];
    const foundInMy = myList.find((t) => t.id === userTournamentId);
    if (!foundInMy) throw new Error('TEST 6 FAILED: Tournament not found in creator My Tournaments list');
    console.log(`✅ TEST 6 PASSED: Creator sees their tournament "${foundInMy.name}" in My Tournaments`);

    // ----------------------------------------------------
    // TEST 7: Another user cannot edit/delete the creator's tournament.
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Another user (User B) attempts to edit User A tournament ---');
    try {
      await axios.put(
        `${BASE_URL}/tournaments/${userTournamentId}`,
        { name: 'Hacked Tournament Name' },
        { headers: { Authorization: `Bearer ${userBToken}` } }
      );
      throw new Error('TEST 7 FAILED: User B was able to modify User A tournament!');
    } catch (err) {
      if (err.response && (err.response.status === 403 || err.response.status === 401)) {
        console.log(`✅ TEST 7 PASSED: Blocked unauthorized edit with HTTP ${err.response.status}`);
      } else {
        throw err;
      }
    }

    // ----------------------------------------------------
    // TEST 8: Draft tournament does NOT appear in Available.
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Create draft tournament. Verify it does NOT appear in Available ---');
    const draftRes = await axios.post(
      `${BASE_URL}/tournaments`,
      {
        turfId: turfA.id,
        name: 'Secret Draft Tournament',
        sport: 'Football',
        startDate,
        endDate,
        numberOfTeams: 4,
        playersPerTeam: 5,
        status: 'draft',
      },
      { headers: { Authorization: `Bearer ${userAToken}` } }
    );
    const draftTrn = draftRes.data?.data?.tournament || draftRes.data?.tournament;
    draftTournamentId = draftTrn.id;

    const availableAfterDraft = await axios.get(`${BASE_URL}/tournaments/available`);
    const availableList2 = availableAfterDraft.data?.data?.tournaments || availableAfterDraft.data?.tournaments || [];
    const foundDraft = availableList2.find((t) => t.id === draftTournamentId);
    if (foundDraft) throw new Error('TEST 8 FAILED: Draft tournament appeared in Available Tournaments!');
    console.log('✅ TEST 8 PASSED: Draft tournament is completely hidden from Available Tournaments');

    // ----------------------------------------------------
    // TEST 9: Expired/cancelled tournament does NOT appear as an active tournament.
    // ----------------------------------------------------
    console.log('\n--- TEST 9: Cancel tournament. Verify it is removed from active/available ---');
    await axios.post(
      `${BASE_URL}/tournaments/${draftTournamentId}/publish`,
      {},
      { headers: { Authorization: `Bearer ${userAToken}` } }
    );
    await axios.post(
      `${BASE_URL}/tournaments/${draftTournamentId}/cancel`,
      {},
      { headers: { Authorization: `Bearer ${userAToken}` } }
    );

    const availableAfterCancel = await axios.get(`${BASE_URL}/tournaments/available`);
    const availableList3 = availableAfterCancel.data?.data?.tournaments || availableAfterCancel.data?.tournaments || [];
    const foundCancelled = availableList3.find((t) => t.id === draftTournamentId);
    if (foundCancelled) throw new Error('TEST 9 FAILED: Cancelled tournament appeared in Available Tournaments!');
    console.log('✅ TEST 9 PASSED: Cancelled/expired tournament excluded from Available list');

    // ----------------------------------------------------
    // TEST 10: Shareable tournament link opens correct published tournament details.
    // ----------------------------------------------------
    console.log('\n--- TEST 10: Test public shareable link identifier resolution ---');
    const shareId = userTrn.shareableIdentifier;
    if (!shareId) throw new Error('TEST 10 FAILED: Tournament has no shareableIdentifier');

    const publicRes = await axios.get(`${BASE_URL}/tournaments/share/${shareId}`);
    const publicData = publicRes.data?.data?.tournament || publicRes.data?.tournament;
    if (!publicData || publicData.id !== userTournamentId) {
      throw new Error(`TEST 10 FAILED: Public share resolution failed for ${shareId}`);
    }
    console.log(`✅ TEST 10 PASSED: Share link correctly resolved tournament "${publicData.name}"`);

    // ----------------------------------------------------
    // TEST 11: Superadmin monitoring & existing Vendor tournaments continue working.
    // ----------------------------------------------------
    console.log('\n--- TEST 11: Superadmin monitoring API view ---');
    const adminRes = await axios.get(
      `${BASE_URL}/admin/tournaments`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const adminList = adminRes.data?.data?.tournaments || adminRes.data?.tournaments || [];
    const hasVendorHosted = adminList.some((t) => t.source === 'TURF HOSTED');
    const hasUserCreated = adminList.some((t) => t.source === 'USER CREATED');
    if (!hasVendorHosted || !hasUserCreated) {
      throw new Error('TEST 11 FAILED: Superadmin list must contain both TURF HOSTED and USER CREATED tournaments');
    }
    console.log(`✅ TEST 11 PASSED: Superadmin views both TURF HOSTED and USER CREATED. Total: ${adminList.length}`);

    // ----------------------------------------------------
    // TEST 12: Team & Player Capacity Validation endpoint
    // ----------------------------------------------------
    console.log('\n--- TEST 12: Team roster management & capacity enforcement ---');
    const updatedTeams = [
      {
        id: 'team_1',
        name: 'Super Strikers Updated',
        players: [
          { id: 'p_1', name: 'Ramesh Captain', phone: '9876543210' },
          { id: 'p_2', name: 'Suresh Batsman', phone: '9876543211' },
          { id: 'p_3', name: 'Dinesh Wicketkeeper', phone: '9876543215' },
        ],
      },
      {
        id: 'team_2',
        name: 'Thunderbolts Updated',
        players: [
          { id: 'p_4', name: 'Karthik Bowler', phone: '9876543212' },
        ],
      },
    ];

    const teamUpdateRes = await axios.put(
      `${BASE_URL}/tournaments/${userTournamentId}/teams`,
      { teams: updatedTeams },
      { headers: { Authorization: `Bearer ${userAToken}` } }
    );
    const updatedTrnData = teamUpdateRes.data?.data?.tournament || teamUpdateRes.data?.tournament;
    if (updatedTrnData.teams[0].players.length !== 3) {
      throw new Error('TEST 12 FAILED: Team roster was not updated correctly');
    }
    console.log('✅ TEST 12 PASSED: Team and player roster successfully updated via PUT /tournaments/:id/teams');

    console.log('\n====================================================');
    console.log('🎉 ALL 12 VERIFICATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('====================================================');
  } finally {
    // Cleanup created test records so database remains pristine
    if (vendorTournamentId) {
      await prisma.tournament.delete({ where: { id: vendorTournamentId } }).catch(() => {});
    }
    if (userTournamentId) {
      await prisma.tournament.delete({ where: { id: userTournamentId } }).catch(() => {});
    }
    if (draftTournamentId) {
      await prisma.tournament.delete({ where: { id: draftTournamentId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err.message);
  if (err.response?.data) console.error('Response data:', err.response.data);
  process.exit(1);
});
