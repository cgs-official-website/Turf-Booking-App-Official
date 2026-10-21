require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://127.0.0.1:5000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_change_in_production';

async function main() {
  console.log('========================================================================');
  console.log('🧪 VERIFYING TOURNAMENT REGISTRATION APPROVAL OWNERSHIP');
  console.log('========================================================================\n');

  // Find active turf with vendor
  const turf = await prisma.turf.findFirst({
    where: { status: 'active' },
    include: { vendor: true },
  });

  if (!turf || !turf.vendorId) {
    throw new Error('No active turf with vendor found in DB.');
  }

  // Find at least 3 active users
  const users = await prisma.user.findMany({
    where: { status: 'active' },
    take: 3,
  });

  if (users.length < 3) {
    throw new Error('Need at least 3 users in database to test.');
  }

  const [userA, userB, userC] = users;

  console.log(`📍 Turf: "${turf.name}" (ID: ${turf.id}, Vendor: ${turf.vendorId})`);
  console.log(`👤 User A (Creator): "${userA.name}" (ID: ${userA.id})`);
  console.log(`👤 User B (Team Ohh): "${userB.name}" (ID: ${userB.id})`);
  console.log(`👤 User C (Team Hey): "${userC.name}" (ID: ${userC.id})\n`);

  const userAToken = jwt.sign({ uid: userA.id, id: userA.id, role: 'user' }, JWT_SECRET, { expiresIn: '1d' });
  const userBToken = jwt.sign({ uid: userB.id, id: userB.id, role: 'user' }, JWT_SECRET, { expiresIn: '1d' });
  const userCToken = jwt.sign({ uid: userC.id, id: userC.id, role: 'user' }, JWT_SECRET, { expiresIn: '1d' });
  const vendorToken = jwt.sign({ uid: turf.vendorId, id: turf.vendorId, role: 'vendor', vendorId: turf.vendorId }, JWT_SECRET, { expiresIn: '1d' });

  let userTournamentId = null;
  let vendorTournamentId = null;

  try {
    // ------------------------------------------------------------------
    // STEP 1: User A creates tournament "Bbb" with capacity 3
    // ------------------------------------------------------------------
    console.log('--- Step 1: User A creates tournament "Bbb" (capacity: 3 teams) ---');
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const regStartDate = fmt(new Date(today.getTime() - 24 * 3600 * 1000));
    const regEndDate = fmt(new Date(today.getTime() + 2 * 24 * 3600 * 1000));
    const tournStartDate = fmt(new Date(today.getTime() + 3 * 24 * 3600 * 1000));
    const tournEndDate = fmt(new Date(today.getTime() + 5 * 24 * 3600 * 1000));

    const createRes = await axios.post(
      `${BASE_URL}/tournaments`,
      {
        name: `Bbb ${Date.now()}`,
        sport: 'Football',
        turfId: turf.id,
        numberOfTeams: 3,
        participantCapacity: 3,
        playersPerTeam: 2,
        registrationStartDate: regStartDate,
        registrationEndDate: regEndDate,
        startDate: tournStartDate,
        endDate: tournEndDate,
        status: 'pending_approval',
      },
      { headers: { Authorization: `Bearer ${userAToken}` } }
    );

    userTournamentId = createRes.data?.data?.tournament?.id || createRes.data?.tournament?.id;
    console.log(`✅ Tournament created (ID: ${userTournamentId})`);

    // Turf vendor approves tournament hosting
    console.log('Turf vendor approves tournament hosting...');
    await axios.post(
      `${BASE_URL}/vendor/tournaments/${userTournamentId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${vendorToken}` } }
    );
    console.log('✅ Tournament approved and published.\n');

    // ------------------------------------------------------------------
    // STEP 2: User B registers Team "Ohh"
    // ------------------------------------------------------------------
    console.log('--- Step 2: User B registers Team "Ohh" ---');
    const regBRes = await axios.post(
      `${BASE_URL}/tournaments/${userTournamentId}/register`,
      {
        teamName: 'Ohh',
        captainName: 'User B Captain',
        captainPhone: '9876543210',
        players: [
          { name: 'Player B1', phone: '9876543210' },
          { name: 'Player B2', phone: '9876543211' },
        ],
      },
      { headers: { Authorization: `Bearer ${userBToken}` } }
    );

    const regOhh = regBRes.data?.data?.registration || regBRes.data?.registration;
    console.log(`Registration status for "Ohh": "${regOhh.status}"`);
    if (regOhh.status !== 'pending') {
      throw new Error(`Expected Team Ohh to have status 'pending', got '${regOhh.status}'`);
    }
    console.log('✅ Team Ohh registered as PENDING.\n');

    // ------------------------------------------------------------------
    // STEP 3: User C registers Team "Hey"
    // ------------------------------------------------------------------
    console.log('--- Step 3: User C registers Team "Hey" ---');
    const regCRes = await axios.post(
      `${BASE_URL}/tournaments/${userTournamentId}/register`,
      {
        teamName: 'Hey',
        captainName: 'User C Captain',
        captainPhone: '9876543220',
        players: [
          { name: 'Player C1', phone: '9876543220' },
          { name: 'Player C2', phone: '9876543221' },
        ],
      },
      { headers: { Authorization: `Bearer ${userCToken}` } }
    );

    const regHey = regCRes.data?.data?.registration || regCRes.data?.registration;
    console.log(`Registration status for "Hey": "${regHey.status}"`);
    if (regHey.status !== 'pending') {
      throw new Error(`Expected Team Hey to have status 'pending', got '${regHey.status}'`);
    }
    console.log('✅ Team Hey registered as PENDING.\n');

    // ------------------------------------------------------------------
    // STEP 4: Verify Turf Vendor CANNOT approve registrations for User A's tournament
    // ------------------------------------------------------------------
    console.log('--- Step 4: Turf Vendor attempts to approve Team "Ohh" (MUST FAIL) ---');
    try {
      await axios.post(
        `${BASE_URL}/vendor/tournaments/${userTournamentId}/registrations/${regOhh.id}/accept`,
        {},
        { headers: { Authorization: `Bearer ${vendorToken}` } }
      );
      throw new Error('SECURITY VIOLATION: Turf Vendor was able to approve User A\'s tournament team!');
    } catch (err) {
      if (err.response && (err.response.status === 403 || err.response.status === 404)) {
        console.log(`✅ Correctly rejected vendor approval attempt with HTTP ${err.response.status}: ${err.response.data?.message}`);
      } else {
        throw err;
      }
    }

    // ------------------------------------------------------------------
    // STEP 5: User A (Tournament Creator) reviews pending registrations
    // ------------------------------------------------------------------
    console.log('\n--- Step 5: User A (Creator) fetches tournament registrations ---');
    const userRegsRes = await axios.get(
      `${BASE_URL}/tournaments/${userTournamentId}/registrations`,
      { headers: { Authorization: `Bearer ${userAToken}` } }
    );

    const regsList = userRegsRes.data?.data?.registrations || userRegsRes.data?.registrations;
    console.log(`Found ${regsList.length} registrations for User A.`);
    const ohhInList = regsList.find((r) => r.id === regOhh.id);
    const heyInList = regsList.find((r) => r.id === regHey.id);

    if (!ohhInList || ohhInList.status !== 'pending') {
      throw new Error('Expected Ohh to be in registrations list with status pending.');
    }
    if (!heyInList || heyInList.status !== 'pending') {
      throw new Error('Expected Hey to be in registrations list with status pending.');
    }
    console.log('✅ User A sees both Ohh and Hey as PENDING.\n');

    // ------------------------------------------------------------------
    // STEP 6: User A accepts Team "Ohh"
    // ------------------------------------------------------------------
    console.log('--- Step 6: User A accepts Team "Ohh" ---');
    const acceptRes = await axios.post(
      `${BASE_URL}/tournaments/${userTournamentId}/registrations/${regOhh.id}/accept`,
      {},
      { headers: { Authorization: `Bearer ${userAToken}` } }
    );
    console.log(`Accept result: ${acceptRes.data?.message}`);

    // Verify tournament capacity & slots
    const detailAfterAccept = await axios.get(`${BASE_URL}/tournaments/${userTournamentId}`);
    const tournAfterAccept = detailAfterAccept.data?.data?.tournament || detailAfterAccept.data?.tournament;
    const acceptedCount = (tournAfterAccept.registrations || []).filter((r) => r.status === 'accepted').length;
    const remainingSlots = Math.max(0, tournAfterAccept.participantCapacity - acceptedCount);

    console.log(`Capacity stats: ${acceptedCount} / ${tournAfterAccept.participantCapacity} Confirmed, ${remainingSlots} Slots Left`);
    if (acceptedCount !== 1) {
      throw new Error(`Expected 1 accepted team, got: ${acceptedCount}`);
    }
    if (remainingSlots !== 2) {
      throw new Error(`Expected 2 remaining slots, got: ${remainingSlots}`);
    }
    console.log('✅ Ohh is Confirmed. Capacity updated: 1 / 3 Confirmed, 2 Slots Left.\n');

    // ------------------------------------------------------------------
    // STEP 7: User A rejects Team "Hey"
    // ------------------------------------------------------------------
    console.log('--- Step 7: User A rejects Team "Hey" ---');
    const rejectRes = await axios.post(
      `${BASE_URL}/tournaments/${userTournamentId}/registrations/${regHey.id}/reject`,
      { reason: 'Roster incomplete for format' },
      { headers: { Authorization: `Bearer ${userAToken}` } }
    );
    console.log(`Reject result: ${rejectRes.data?.message}`);

    const detailAfterReject = await axios.get(`${BASE_URL}/tournaments/${userTournamentId}`);
    const tournAfterReject = detailAfterReject.data?.data?.tournament || detailAfterReject.data?.tournament;
    const rejectedReg = (tournAfterReject.registrations || []).find((r) => r.id === regHey.id);

    if (rejectedReg.status !== 'rejected') {
      throw new Error(`Expected Hey to have status 'rejected', got '${rejectedReg.status}'`);
    }
    if (rejectedReg.rejectionReason !== 'Roster incomplete for format') {
      throw new Error(`Expected rejectionReason 'Roster incomplete for format', got '${rejectedReg.rejectionReason}'`);
    }
    console.log('✅ Hey is Rejected with reason preserved.\n');

    // ------------------------------------------------------------------
    // STEP 8: Verify Vendor Created Tournament continues using Vendor Approval
    // ------------------------------------------------------------------
    console.log('--- Step 8: Vendor Created Tournament Approval Flow ---');
    const vendorCreateRes = await axios.post(
      `${BASE_URL}/vendor/tournaments`,
      {
        name: `Vendor Premier League ${Date.now()}`,
        sport: 'Football',
        turfId: turf.id,
        numberOfTeams: 4,
        participantCapacity: 4,
        playersPerTeam: 2,
        registrationStartDate: regStartDate,
        registrationEndDate: regEndDate,
        startDate: tournStartDate,
        endDate: tournEndDate,
        status: 'published',
      },
      { headers: { Authorization: `Bearer ${vendorToken}` } }
    );

    vendorTournamentId = vendorCreateRes.data?.data?.tournament?.id || vendorCreateRes.data?.tournament?.id;
    console.log(`Vendor tournament created (ID: ${vendorTournamentId})`);

    // User B registers for vendor tournament
    const regVendorRes = await axios.post(
      `${BASE_URL}/tournaments/${vendorTournamentId}/register`,
      {
        teamName: 'Alpha FC',
        captainName: 'User B Captain',
        captainPhone: '9876543210',
        players: [
          { name: 'Player B1', phone: '9876543210' },
          { name: 'Player B2', phone: '9876543211' },
        ],
      },
      { headers: { Authorization: `Bearer ${userBToken}` } }
    );
    const regAlpha = regVendorRes.data?.data?.registration || regVendorRes.data?.registration;
    console.log(`Alpha FC registered with status: "${regAlpha.status}"`);

    // User A attempts to approve Alpha FC on Vendor's tournament (MUST FAIL)
    try {
      await axios.post(
        `${BASE_URL}/tournaments/${vendorTournamentId}/registrations/${regAlpha.id}/accept`,
        {},
        { headers: { Authorization: `Bearer ${userAToken}` } }
      );
      throw new Error('User A was able to approve a team on Vendor\'s tournament!');
    } catch (err) {
      if (err.response && (err.response.status === 403 || err.response.status === 404)) {
        console.log(`✅ Correctly prevented non-creator User A from approving vendor tournament team (HTTP ${err.response.status})`);
      } else {
        throw err;
      }
    }

    // Vendor approves Alpha FC on Vendor's tournament (MUST SUCCEED)
    const vendorAcceptRes = await axios.post(
      `${BASE_URL}/vendor/tournaments/${vendorTournamentId}/registrations/${regAlpha.id}/accept`,
      {},
      { headers: { Authorization: `Bearer ${vendorToken}` } }
    );
    console.log(`Vendor accept result: ${vendorAcceptRes.data?.message}`);
    console.log('✅ Vendor-created tournament approval succeeded for vendor.\n');

    console.log('========================================================================');
    console.log('🎉 ALL TOURNAMENT REGISTRATION APPROVAL OWNERSHIP TESTS PASSED!');
    console.log('========================================================================');
  } catch (error) {
    console.error('❌ Test failed with error:', error.response?.data || error.message);
    process.exit(1);
  } finally {
    // Cleanup
    if (userTournamentId) {
      await prisma.tournamentRegistration.deleteMany({ where: { tournamentId: userTournamentId } }).catch(() => {});
      await prisma.tournament.delete({ where: { id: userTournamentId } }).catch(() => {});
    }
    if (vendorTournamentId) {
      await prisma.tournamentRegistration.deleteMany({ where: { tournamentId: vendorTournamentId } }).catch(() => {});
      await prisma.tournament.delete({ where: { id: vendorTournamentId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

main();
