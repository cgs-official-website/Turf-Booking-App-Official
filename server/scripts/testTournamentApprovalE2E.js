require('dotenv').config();
const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://127.0.0.1:5000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'your_long_random_jwt_secret_key_minimum_32_characters';

function createToken(payload) {
  return jwt.sign({ uid: payload.id, ...payload }, JWT_SECRET, { expiresIn: '7d' });
}

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runE2E() {
  console.log('================================================================');
  console.log('🏆 END-TO-END TOURNAMENT APPROVAL WORKFLOW VERIFICATION');
  console.log('================================================================\n');

  try {
    // ----------------------------------------------------
    // SETUP FIXTURES: User, Turf Owner (Vendor A), Other Vendor (Vendor B), Turf A
    // ----------------------------------------------------
    console.log('▶ [Step 1] Setting up Test Actors & Venues...');

    // User Creator
    const user = await prisma.user.upsert({
      where: { phone: '+919999900001' },
      update: { name: 'E2E Tournament Organizer' },
      create: {
        id: 'user_e2e_organizer_test',
        phone: '+919999900001',
        name: 'E2E Tournament Organizer',
        email: 'organizer_e2e@test.com',
      },
    });
    const userToken = createToken({ id: user.id, role: 'user', phone: user.phone });

    // Turf Owner (Vendor A)
    const vendorA = await prisma.vendor.upsert({
      where: { email: 'vendora_e2e@test.com' },
      update: { name: 'Vendor Mohan Arena Owner' },
      create: {
        id: 'vendor_a_test_owner',
        email: 'vendora_e2e@test.com',
        phone: '+919888800001',
        name: 'Vendor Mohan Arena Owner',
        passwordHash: 'dummy_hash_for_test',
      },
    });
    const vendorAToken = createToken({ id: vendorA.id, role: 'vendor', phone: vendorA.phone });

    // Different Turf Owner (Vendor B - should NOT receive requests for Turf A)
    const vendorB = await prisma.vendor.upsert({
      where: { email: 'vendorb_e2e@test.com' },
      update: { name: 'Vendor Devi Separate Venue' },
      create: {
        id: 'vendor_b_test_other',
        email: 'vendorb_e2e@test.com',
        phone: '+919888800002',
        name: 'Vendor Devi Separate Venue',
        passwordHash: 'dummy_hash_for_test',
      },
    });
    const vendorBToken = createToken({ id: vendorB.id, role: 'vendor', phone: vendorB.phone });

    // Turf A owned by Vendor A
    const turfA = await prisma.turf.upsert({
      where: { id: 'turf_e2e_test_arena_a' },
      update: { vendorId: vendorA.id, name: 'Champions Arena A' },
      create: {
        id: 'turf_e2e_test_arena_a',
        vendorId: vendorA.id,
        name: 'Champions Arena A',
        city: 'Chennai',
        location: { address: '100 Feet Road, Velachery', city: 'Chennai' },
        pricePerHour: 800,
        sports: ['Cricket', 'Football'],
        status: 'active',
      },
    });

    // Turf B owned by Vendor B
    const turfB = await prisma.turf.upsert({
      where: { id: 'turf_e2e_test_arena_b' },
      update: { vendorId: vendorB.id, name: 'Separate Arena B' },
      create: {
        id: 'turf_e2e_test_arena_b',
        vendorId: vendorB.id,
        name: 'Separate Arena B',
        city: 'Chennai',
        location: { address: 'Anna Nagar West', city: 'Chennai' },
        pricePerHour: 900,
        sports: ['Cricket'],
        status: 'active',
      },
    });

    console.log(`  Actor: User "${user.name}" (${user.id})`);
    console.log(`  Turf A: "${turfA.name}" (${turfA.id}) owned by Vendor A: "${vendorA.name}" (${vendorA.id})`);
    console.log(`  Turf B: "${turfB.name}" (${turfB.id}) owned by Vendor B: "${vendorB.name}" (${vendorB.id})`);
    console.log('  ✅ Actor setup complete.\n');

    // ----------------------------------------------------
    // SCENARIO 1: User creates tournament for Turf A -> Published (Submits for approval)
    // ----------------------------------------------------
    console.log('▶ [Step 2] User creates Tournament for Turf A with publishNow: true...');

    const createPayload = {
      turfId: turfA.id,
      name: `Premier League ${Date.now()}`,
      sport: 'Cricket',
      registrationStartDate: '2026-11-01',
      registrationEndDate: '2026-11-05',
      startDate: '2026-11-08',
      endDate: '2026-11-12',
      numberOfTeams: 4,
      playersPerTeam: 7,
      oversPerTeam: 8,
      description: 'Official E2E Tournament Approval Verification Event',
      publishNow: true,
    };

    const createRes = await api('/tournaments', {
      method: 'POST',
      body: createPayload,
      token: userToken,
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create tournament: ${JSON.stringify(createRes.data)}`);
    }

    const createdTournament = createRes.data?.data?.tournament;
    const tournamentId = createdTournament.id;
    console.log(`  Created Tournament ID: ${tournamentId}`);
    console.log(`  Status: "${createdTournament.status}", ApprovalStatus: "${createdTournament.approvalStatus}"`);
    console.log(`  Turf ID: "${createdTournament.turfId}", Vendor ID: "${createdTournament.vendorId}"`);

    // Verify Backend DB State
    if (createdTournament.status !== 'pending_approval') {
      throw new Error(`Expected status to be 'pending_approval', got: ${createdTournament.status}`);
    }
    if (createdTournament.approvalStatus !== 'pending') {
      throw new Error(`Expected approvalStatus to be 'pending', got: ${createdTournament.approvalStatus}`);
    }
    if (createdTournament.turfId !== turfA.id) {
      throw new Error(`Expected turfId to be ${turfA.id}, got: ${createdTournament.turfId}`);
    }
    if (createdTournament.vendorId !== vendorA.id) {
      throw new Error(`Expected vendorId to be ${vendorA.id}, got: ${createdTournament.vendorId}`);
    }
    console.log('  ✅ DB State verified: Associated with correct turf & owner, set to pending_approval.\n');

    // ----------------------------------------------------
    // [Step 3] Verify Notification Isolation in PostgreSQL DB
    // ----------------------------------------------------
    console.log('▶ [Step 3] Verifying FCM / Database Notification routing...');

    const vendorANotifs = await prisma.notification.findMany({
      where: {
        recipientId: vendorA.id,
        recipientType: 'vendor',
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const matchingNotifForVendorA = vendorANotifs.find(
      (n) => n.data && (n.data.tournamentId === tournamentId || n.data.id === tournamentId)
    );

    if (!matchingNotifForVendorA) {
      throw new Error(`Vendor A (${vendorA.id}) did not receive notification for tournament ${tournamentId}!`);
    }
    console.log(`  ✅ Vendor A Notification Found: "${matchingNotifForVendorA.title}" - "${matchingNotifForVendorA.body}"`);
    console.log(`     Action: ${matchingNotifForVendorA.data?.action}, Screen: ${matchingNotifForVendorA.data?.screen}`);

    // Confirm Vendor B did NOT receive this notification
    const vendorBNotifs = await prisma.notification.findMany({
      where: {
        recipientId: vendorB.id,
        recipientType: 'vendor',
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const leakNotifForVendorB = vendorBNotifs.find(
      (n) => n.data && (n.data.tournamentId === tournamentId || n.data.id === tournamentId)
    );

    if (leakNotifForVendorB) {
      throw new Error(`Notification LEAK! Vendor B (${vendorB.id}) received notification for Vendor A's turf tournament!`);
    }
    console.log('  ✅ Confirmed: Vendor B did NOT receive the notification (Strict isolation maintained).\n');

    // ----------------------------------------------------
    // [Step 4] Verify Vendor A App retrieval (GET /vendor/tournaments & GET /notifications)
    // ----------------------------------------------------
    console.log('▶ [Step 4] Vendor A retrieves Tournaments & Notifications...');

    // 1. Tournaments list
    const vendorATournRes = await api('/vendor/tournaments', {
      method: 'GET',
      token: vendorAToken,
    });
    if (!vendorATournRes.ok) {
      throw new Error(`Vendor A failed to fetch tournaments: ${JSON.stringify(vendorATournRes.data)}`);
    }
    const vendorATournaments = vendorATournRes.data?.data?.tournaments || [];
    const foundInVendorA = vendorATournaments.find((t) => t.id === tournamentId);
    if (!foundInVendorA) {
      throw new Error(`Vendor A cannot see tournament ${tournamentId} in their tournament list!`);
    }
    console.log(`  ✅ Tournament "${foundInVendorA.name}" appears in Vendor A list (status: ${foundInVendorA.status})`);

    // 2. Notifications inbox
    const vendorANotifRes = await api('/notifications', {
      method: 'GET',
      token: vendorAToken,
    });
    if (!vendorANotifRes.ok) {
      throw new Error(`Vendor A failed to fetch notifications: ${JSON.stringify(vendorANotifRes.data)}`);
    }
    const inboxNotifsVendorA = vendorANotifRes.data?.data?.notifications || [];
    const foundInboxNotifA = inboxNotifsVendorA.find(
      (n) => n.data && (n.data.tournamentId === tournamentId || n.data.id === tournamentId)
    );
    if (!foundInboxNotifA) {
      throw new Error(`Vendor A cannot see notification in GET /notifications inbox!`);
    }
    console.log(`  ✅ Notification appears in Vendor A Inbox (title: "${foundInboxNotifA.title}")\n`);

    // ----------------------------------------------------
    // [Step 5] Verify Vendor B CANNOT see tournament or notification
    // ----------------------------------------------------
    console.log('▶ [Step 5] Verifying Vendor B Isolation (Different turf owner)...');

    const vendorBTournRes = await api('/vendor/tournaments', {
      method: 'GET',
      token: vendorBToken,
    });
    const vendorBTournaments = vendorBTournRes.data?.data?.tournaments || [];
    const leakInVendorB = vendorBTournaments.find((t) => t.id === tournamentId);
    if (leakInVendorB) {
      throw new Error(`Vendor B was able to see tournament ${tournamentId} belonging to Vendor A!`);
    }
    console.log('  ✅ Confirmed: Vendor B cannot see the tournament request.');

    const vendorBNotifRes = await api('/notifications', {
      method: 'GET',
      token: vendorBToken,
    });
    const inboxNotifsVendorB = vendorBNotifRes.data?.data?.notifications || [];
    const leakInboxB = inboxNotifsVendorB.find(
      (n) => n.data && (n.data.tournamentId === tournamentId || n.data.id === tournamentId)
    );
    if (leakInboxB) {
      throw new Error(`Vendor B was able to see notification for tournament ${tournamentId}!`);
    }
    console.log('  ✅ Confirmed: Vendor B cannot see the notification in their Inbox.\n');

    // ----------------------------------------------------
    // [Step 6] Vendor A Approves Tournament Request
    // ----------------------------------------------------
    console.log('▶ [Step 6] Vendor A Approves Tournament Request...');

    const approveRes = await api(`/vendor/tournaments/${tournamentId}/approve`, {
      method: 'POST',
      token: vendorAToken,
    });

    if (!approveRes.ok) {
      throw new Error(`Vendor A failed to approve tournament: ${JSON.stringify(approveRes.data)}`);
    }

    const approvedTournament = approveRes.data?.data?.tournament;
    console.log(`  Approved Tournament Status: "${approvedTournament.status}", ApprovalStatus: "${approvedTournament.approvalStatus}"`);
    console.log(`  Shareable URL: ${approvedTournament.shareableUrl}`);

    if (approvedTournament.status !== 'published') {
      throw new Error(`Expected approved tournament status to be 'published', got: ${approvedTournament.status}`);
    }
    if (approvedTournament.approvalStatus !== 'approved') {
      throw new Error(`Expected approved tournament approvalStatus to be 'approved', got: ${approvedTournament.approvalStatus}`);
    }

    // Verify creator user received approval notification in DB
    const userNotifs = await prisma.notification.findMany({
      where: {
        recipientId: user.id,
        recipientType: 'user',
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const userApprovalNotif = userNotifs.find(
      (n) => n.data && (n.data.tournamentId === tournamentId || n.data.id === tournamentId) && n.data?.action === 'tournament_approved'
    );
    if (!userApprovalNotif) {
      throw new Error(`User ${user.id} did not receive tournament_approved notification!`);
    }
    console.log(`  ✅ User received approval notification: "${userApprovalNotif.title}" - "${userApprovalNotif.body}"`);

    // Verify tournament is now publicly visible in public available tournaments API
    const publicRes = await api('/tournaments/available', {
      method: 'GET',
    });
    const publicTournaments = publicRes.data?.data?.tournaments || [];
    const foundInPublic = publicTournaments.find((t) => t.id === tournamentId);
    if (!foundInPublic) {
      throw new Error(`Approved tournament is not appearing in public available tournaments list!`);
    }
    console.log(`  ✅ Approved tournament is now publicly discoverable in UserApp available tournaments list.\n`);

    // ----------------------------------------------------
    // [Step 7] Rejection Workflow Verification
    // ----------------------------------------------------
    console.log('▶ [Step 7] Testing Tournament Rejection Workflow...');

    // User creates Tournament 2
    const create2Res = await api('/tournaments', {
      method: 'POST',
      body: {
        turfId: turfA.id,
        name: `Autumn Challenge ${Date.now()}`,
        sport: 'Football',
        registrationStartDate: '2026-11-15',
        registrationEndDate: '2026-11-18',
        startDate: '2026-11-20',
        endDate: '2026-11-22',
        numberOfTeams: 4,
        playersPerTeam: 5,
        publishNow: true,
      },
      token: userToken,
    });
    const tourn2 = create2Res.data?.data?.tournament;
    console.log(`  Created Tournament 2: ${tourn2.id}`);

    // Vendor A rejects with reason
    const rejectReason = 'Pitch is undergoing annual resurfacing on these dates';
    const rejectRes = await api(`/vendor/tournaments/${tourn2.id}/reject`, {
      method: 'POST',
      body: { reason: rejectReason },
      token: vendorAToken,
    });
    if (!rejectRes.ok) {
      throw new Error(`Failed to reject tournament: ${JSON.stringify(rejectRes.data)}`);
    }
    const rejectedTournament = rejectRes.data?.data?.tournament;
    console.log(`  Rejected Status: "${rejectedTournament.status}", Rejection Reason: "${rejectedTournament.rejectionReason}"`);

    if (rejectedTournament.status !== 'rejected' || rejectedTournament.approvalStatus !== 'rejected') {
      throw new Error(`Expected status & approvalStatus to be 'rejected'`);
    }

    // Verify creator received rejection notification with the reason
    const userNotifs2 = await prisma.notification.findMany({
      where: { recipientId: user.id, recipientType: 'user' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const userRejectNotif = userNotifs2.find(
      (n) => n.data && (n.data.tournamentId === tourn2.id || n.data.id === tourn2.id) && n.data?.action === 'tournament_rejected'
    );
    if (!userRejectNotif) {
      throw new Error(`User did not receive tournament_rejected notification!`);
    }
    if (!userRejectNotif.body.includes(rejectReason)) {
      throw new Error(`Notification body missing rejection reason. Body: ${userRejectNotif.body}`);
    }
    console.log(`  ✅ User received rejection notification with exact reason: "${userRejectNotif.body}"`);

    // Verify rejected tournament does NOT appear in public list
    const publicRes2 = await api('/tournaments/available', { method: 'GET' });
    const publicTourn2 = (publicRes2.data?.data?.tournaments || []).find((t) => t.id === tourn2.id);
    if (publicTourn2) {
      throw new Error(`Rejected tournament appeared in public list!`);
    }
    console.log('  ✅ Confirmed: Rejected tournament is hidden from public discoverability.\n');

    console.log('================================================================');
    console.log('🎉 ALL 7 E2E TOURNAMENT APPROVAL WORKFLOW VERIFICATIONS PASSED!');
    console.log('================================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ E2E VERIFICATION FAILED:');
    console.error(err);
    process.exit(1);
  }
}

runE2E();
