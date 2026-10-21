require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://127.0.0.1:5000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_change_in_production';

async function main() {
  console.log('====================================================');
  console.log('🧪 TESTING TOURNAMENT PUBLIC REGISTRATION WORKFLOW');
  console.log('====================================================\n');

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

  const [userCreator, userPlayer1, userPlayer2] = users;

  console.log(`📍 Turf: "${turf.name}" (ID: ${turf.id}, Vendor: ${turf.vendorId})`);
  console.log(`👤 User Creator: "${userCreator.name}" (ID: ${userCreator.id})`);
  console.log(`👤 User Player 1: "${userPlayer1.name}" (ID: ${userPlayer1.id})`);
  console.log(`👤 User Player 2: "${userPlayer2.name}" (ID: ${userPlayer2.id})\n`);

  const creatorToken = jwt.sign({ uid: userCreator.id, id: userCreator.id, role: 'user' }, JWT_SECRET, { expiresIn: '1d' });
  const player1Token = jwt.sign({ uid: userPlayer1.id, id: userPlayer1.id, role: 'user' }, JWT_SECRET, { expiresIn: '1d' });
  const player2Token = jwt.sign({ uid: userPlayer2.id, id: userPlayer2.id, role: 'user' }, JWT_SECRET, { expiresIn: '1d' });
  const vendorToken = jwt.sign({ uid: turf.vendorId, id: turf.vendorId, role: 'vendor', vendorId: turf.vendorId }, JWT_SECRET, { expiresIn: '1d' });

  let testTournamentId = null;

  try {
    // ------------------------------------------------------------------
    // STEP 1: Create tournament (2 teams, 2 players per team for test brevity)
    // ------------------------------------------------------------------
    console.log('--- Step 1: User creates tournament ---');
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const regStartDate = fmt(new Date(today.getTime() - 24 * 3600 * 1000)); // Yesterday
    const regEndDate = fmt(new Date(today.getTime() + 2 * 24 * 3600 * 1000)); // In 2 days
    const tournStartDate = fmt(new Date(today.getTime() + 3 * 24 * 3600 * 1000)); // In 3 days
    const tournEndDate = fmt(new Date(today.getTime() + 5 * 24 * 3600 * 1000)); // In 5 days

    const createRes = await axios.post(
      `${BASE_URL}/tournaments`,
      {
        name: `Public Reg Test Cup ${Date.now()}`,
        sport: 'Football',
        turfId: turf.id,
        numberOfTeams: 2,
        participantCapacity: 2,
        playersPerTeam: 2,
        registrationStartDate: regStartDate,
        registrationEndDate: regEndDate,
        startDate: tournStartDate,
        endDate: tournEndDate,
        status: 'pending_approval',
      },
      { headers: { Authorization: `Bearer ${creatorToken}` } }
    );

    testTournamentId = createRes.data?.data?.tournament?.id || createRes.data?.tournament?.id;
    const initialStatus = createRes.data?.data?.tournament?.status || createRes.data?.tournament?.status;
    console.log(`✅ Tournament created (ID: ${testTournamentId}), Status: "${initialStatus}"`);
    if (initialStatus !== 'pending_approval') {
      throw new Error(`Expected initialStatus 'pending_approval', got: ${initialStatus}`);
    }

    // ------------------------------------------------------------------
    // STEP 2: Edge Case Check - Try to register team BEFORE tournament approval
    // ------------------------------------------------------------------
    console.log('\n--- Step 2: Try registering before vendor approval (must fail) ---');
    try {
      await axios.post(
        `${BASE_URL}/tournaments/${testTournamentId}/register`,
        {
          teamName: 'Eager Beavers FC',
          captainName: 'John Doe',
          captainPhone: '9876543210',
          players: [
            { name: 'John Doe', phone: '9876543210' },
            { name: 'Jack Doe', phone: '9876543211' },
          ],
        },
        { headers: { Authorization: `Bearer ${player1Token}` } }
      );
      throw new Error('Registration should have been blocked on pending_approval tournament!');
    } catch (err) {
      const errCode = err.response?.data?.error?.code || err.response?.data?.code;
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message;
      if (err.response && err.response.status === 400 && errCode === 'NOT_APPROVED') {
        console.log(`✅ Successfully blocked unapproved registration: "${errMsg}"`);
      } else {
        throw new Error(`Unexpected error on unapproved registration: ${errMsg}`);
      }
    }

    // ------------------------------------------------------------------
    // STEP 3: Turf/vendor approves tournament
    // ------------------------------------------------------------------
    console.log('\n--- Step 3: Turf/vendor approves tournament ---');
    const approveRes = await axios.post(
      `${BASE_URL}/vendor/tournaments/${testTournamentId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${vendorToken}` } }
    );

    const approvedStatus = approveRes.data?.data?.tournament?.status || approveRes.data?.tournament?.status;
    const approvalStatus = approveRes.data?.data?.tournament?.approvalStatus || approveRes.data?.tournament?.approvalStatus;
    console.log(`✅ Tournament approved. status: "${approvedStatus}", approvalStatus: "${approvalStatus}"`);
    if (approvedStatus !== 'published') {
      throw new Error(`Expected approved status 'published', got: ${approvedStatus}`);
    }

    // ------------------------------------------------------------------
    // STEP 4: Confirm tournament is publicly visible
    // ------------------------------------------------------------------
    console.log('\n--- Step 4: Confirm tournament is publicly visible ---');
    const publicRes = await axios.get(`${BASE_URL}/tournaments/${testTournamentId}`);
    const pubTournament = publicRes.data?.data?.tournament || publicRes.data?.tournament;
    console.log(`✅ Publicly visible. Name: "${pubTournament.name}", lifecycleStatus: "${pubTournament.lifecycleStatus}"`);
    console.log(`   Initial accepted teams: ${pubTournament.acceptedTeamsCount}/${pubTournament.totalTeams}, remainingSlots: ${pubTournament.remainingSlots}`);

    if (pubTournament.acceptedTeamsCount !== 0 || pubTournament.remainingSlots !== 2) {
      throw new Error(`Expected initial accepted: 0/2, remaining: 2. Got accepted: ${pubTournament.acceptedTeamsCount}, remaining: ${pubTournament.remainingSlots}`);
    }

    // ------------------------------------------------------------------
    // STEP 5: Register a different user's team (User Player 1)
    // ------------------------------------------------------------------
    console.log('\n--- Step 5: User Player 1 registers team ---');
    const regPayload1 = {
      teamName: 'Thunder Strikers',
      captainName: 'Alex Hunter',
      captainPhone: '9123456789',
      captainEmail: 'alex@example.com',
      players: [
        { name: 'Alex Hunter', phone: '9123456789' },
        { name: 'Sam Wheeler', phone: '9123456788' },
      ],
    };

    const regRes1 = await axios.post(
      `${BASE_URL}/tournaments/${testTournamentId}/register`,
      regPayload1,
      { headers: { Authorization: `Bearer ${player1Token}` } }
    );

    console.log('✅ Registration response received:');
    const reg1 = regRes1.data?.data?.registration || regRes1.data?.registration;
    const summary1 = regRes1.data?.data?.summary || regRes1.data?.summary;
    console.log(`   Registration ID: ${reg1?.id}`);
    console.log(`   Status: "${reg1?.status}"`);
    console.log(`   Message: "${regRes1.data?.data?.message || regRes1.data?.message}"`);
    console.log(`   Summary: acceptedCount: ${summary1?.acceptedCount}, remainingSlots: ${summary1?.remainingSlots}`);

    if (reg1?.status !== 'accepted') {
      throw new Error(`Expected registration status 'accepted', got: ${reg1?.status}`);
    }
    if (summary1?.acceptedCount !== 1 || summary1?.remainingSlots !== 1) {
      throw new Error(`Expected summary acceptedCount: 1, remainingSlots: 1. Got: ${JSON.stringify(summary1)}`);
    }

    // ------------------------------------------------------------------
    // STEP 6: Confirm User 1 view via GET /tournaments/:id with player1Token
    // ------------------------------------------------------------------
    console.log('\n--- Step 6: Verify User Player 1 tournament view ---');
    const detailRes = await axios.get(
      `${BASE_URL}/tournaments/${testTournamentId}`,
      { headers: { Authorization: `Bearer ${player1Token}` } }
    );
    const detailT = detailRes.data?.data?.tournament || detailRes.data?.tournament;

    console.log(`   acceptedTeamsCount: ${detailT.acceptedTeamsCount} / ${detailT.totalTeams}`);
    console.log(`   remainingSlots: ${detailT.remainingSlots}`);
    console.log(`   myRegistration:`, detailT.myRegistration);

    if (detailT.acceptedTeamsCount !== 1) {
      throw new Error(`Expected acceptedTeamsCount to be 1, got ${detailT.acceptedTeamsCount}`);
    }
    if (detailT.remainingSlots !== 1) {
      throw new Error(`Expected remainingSlots to be 1, got ${detailT.remainingSlots}`);
    }
    if (!detailT.myRegistration) {
      throw new Error('Expected myRegistration to be present for registered user!');
    }
    if (detailT.myRegistration.status !== 'accepted') {
      throw new Error(`Expected myRegistration.status to be 'accepted', got: ${detailT.myRegistration.status}`);
    }

    // Confirm registered team appears in registrations list
    const foundRegInTournament = (detailT.registrations || []).find((r) => r.id === reg1.id);
    if (!foundRegInTournament || foundRegInTournament.status !== 'accepted') {
      throw new Error('Registered team not found with accepted status in tournament.registrations!');
    }
    console.log('✅ Team is confirmed in tournament registrations list and myRegistration is "accepted" (no "pending" approval).');

    // ------------------------------------------------------------------
    // STEP 7: Check Vendor view (vendor does NOT need to approve)
    // ------------------------------------------------------------------
    console.log('\n--- Step 7: Verify Vendor view (vendor receives NO pending approval task) ---');
    const vendorRegsRes = await axios.get(
      `${BASE_URL}/vendor/tournaments/${testTournamentId}/registrations`,
      { headers: { Authorization: `Bearer ${vendorToken}` } }
    );

    const vendorSummary = vendorRegsRes.data?.data?.summary || vendorRegsRes.data?.summary;
    const vendorRegsList = vendorRegsRes.data?.data?.registrations || vendorRegsRes.data?.registrations || [];

    console.log(`   Vendor summary: acceptedCount: ${vendorSummary.acceptedCount}, pendingCount: ${vendorSummary.pendingCount}, remainingSlots: ${vendorSummary.remainingSlots}`);
    console.log(`   Registrations in vendor list: ${vendorRegsList.length}`);

    if (vendorSummary.pendingCount !== 0) {
      throw new Error(`Expected vendor pendingCount to be 0, got ${vendorSummary.pendingCount}`);
    }
    if (vendorSummary.acceptedCount !== 1) {
      throw new Error(`Expected vendor acceptedCount to be 1, got ${vendorSummary.acceptedCount}`);
    }
    const vendorRegItem = vendorRegsList.find((r) => r.id === reg1.id);
    if (!vendorRegItem || vendorRegItem.status !== 'accepted') {
      throw new Error('Vendor registration item not marked as accepted!');
    }
    console.log('✅ Vendor has 0 pending approvals and team is already accepted.');

    // ------------------------------------------------------------------
    // STEP 8: Duplicate Registration Prevention
    // ------------------------------------------------------------------
    console.log('\n--- Step 8: Prevent duplicate registration by same user ---');
    try {
      await axios.post(
        `${BASE_URL}/tournaments/${testTournamentId}/register`,
        regPayload1,
        { headers: { Authorization: `Bearer ${player1Token}` } }
      );
      throw new Error('Duplicate registration should have failed!');
    } catch (err) {
      const errCode = err.response?.data?.error?.code || err.response?.data?.code;
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message;
      if (err.response && err.response.status === 400 && errCode === 'DUPLICATE_REGISTRATION') {
        console.log(`✅ Successfully prevented duplicate registration: "${errMsg}"`);
      } else {
        throw new Error(`Unexpected error on duplicate: ${errMsg}`);
      }
    }

    // ------------------------------------------------------------------
    // STEP 9: Register 2nd team (User Player 2) to fill the tournament
    // ------------------------------------------------------------------
    console.log('\n--- Step 9: User Player 2 registers team (fills capacity 2/2) ---');
    const regPayload2 = {
      teamName: 'Blaze Warriors',
      captainName: 'Carlos Ray',
      captainPhone: '9555444333',
      captainEmail: 'carlos@example.com',
      players: [
        { name: 'Carlos Ray', phone: '9555444333' },
        { name: 'Leo Smith', phone: '9555444332' },
      ],
    };

    const regRes2 = await axios.post(
      `${BASE_URL}/tournaments/${testTournamentId}/register`,
      regPayload2,
      { headers: { Authorization: `Bearer ${player2Token}` } }
    );

    const reg2 = regRes2.data?.data?.registration || regRes2.data?.registration;
    console.log(`✅ Team 2 registered: ID: ${reg2?.id}, status: "${reg2?.status}"`);

    // Verify tournament is now full
    const fullCheckRes = await axios.get(`${BASE_URL}/tournaments/${testTournamentId}`);
    const fullT = fullCheckRes.data?.data?.tournament || fullCheckRes.data?.tournament;
    console.log(`   Final: acceptedTeamsCount: ${fullT.acceptedTeamsCount} / ${fullT.totalTeams}, remainingSlots: ${fullT.remainingSlots}, isFull: ${fullT.isFull}`);

    if (fullT.acceptedTeamsCount !== 2 || fullT.remainingSlots !== 0 || !fullT.isFull) {
      throw new Error(`Expected tournament to be full (2/2, 0 slots left). Got accepted: ${fullT.acceptedTeamsCount}, remaining: ${fullT.remainingSlots}, isFull: ${fullT.isFull}`);
    }

    // ------------------------------------------------------------------
    // STEP 10: Prevent registration when tournament is FULL
    // ------------------------------------------------------------------
    console.log('\n--- Step 10: Prevent registration when tournament is full ---');
    // Using a 4th temporary token/user
    const overflowUserToken = jwt.sign({ uid: 'overflow_user_99', id: 'overflow_user_99', role: 'user' }, JWT_SECRET, { expiresIn: '1d' });
    try {
      await axios.post(
        `${BASE_URL}/tournaments/${testTournamentId}/register`,
        {
          teamName: 'Overflow FC',
          captainName: 'Over Flow',
          captainPhone: '9000000000',
          players: [
            { name: 'Over Flow', phone: '9000000000' },
            { name: 'Under Flow', phone: '9000000001' },
          ],
        },
        { headers: { Authorization: `Bearer ${overflowUserToken}` } }
      );
      throw new Error('Registration should have been blocked because tournament is full!');
    } catch (err) {
      const errCode = err.response?.data?.error?.code || err.response?.data?.code;
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message;
      if (err.response && err.response.status === 400 && errCode === 'TOURNAMENT_FULL') {
        console.log(`✅ Successfully blocked registration when full: "${errMsg}"`);
      } else {
        throw new Error(`Unexpected error on full tournament: ${errMsg}`);
      }
    }

    console.log('\n====================================================');
    console.log('🎉 ALL 10 VERIFICATION STEPS PASSED SUCCESSFULLY!');
    console.log('====================================================');
  } finally {
    // Clean up test tournament and registrations
    if (testTournamentId) {
      console.log(`\n🧹 Cleaning up test tournament (${testTournamentId})...`);
      await prisma.tournamentRegistration.deleteMany({ where: { tournamentId: testTournamentId } });
      await prisma.tournament.delete({ where: { id: testTournamentId } });
      console.log('✅ Clean up complete.');
    }
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
