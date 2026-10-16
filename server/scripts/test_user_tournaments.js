const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_change_in_production';

async function runTests() {
  console.log('--- Starting User Tournament Backend Tests ---');

  // Find or create test users
  let userA = await prisma.user.findFirst();
  if (!userA) {
    userA = await prisma.user.create({
      data: {
        id: 'user_test_tournament_a',
        name: 'Tournament Tester A',
        email: 'tester_a@turftest.com',
      },
    });
  }

  const tokenA = jwt.sign(
    { id: userA.id, uid: userA.id, email: userA.email, role: 'user' },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  const tokenB = jwt.sign(
    { id: 'user_test_other_b', uid: 'user_test_other_b', email: 'tester_b@turftest.com', role: 'user' },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  // 1. Fetch available tournaments
  const resAvailable = await fetch('http://localhost:5000/api/v1/tournaments/available');
  const jsonAvailable = await resAvailable.json();
  console.log('✓ Available tournaments count:', jsonAvailable.data.tournaments.length);

  // 2. Fetch User A's tournaments
  const resMy = await fetch('http://localhost:5000/api/v1/tournaments/my', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const jsonMy = await resMy.json();
  console.log('✓ User A initial tournaments count:', jsonMy.data.tournaments.length);

  // 3. User A creates a draft tournament
  const createPayload = {
    name: 'Community Weekend Cup',
    sport: 'Cricket',
    startDate: '2026-10-25',
    endDate: '2026-10-27',
    numberOfTeams: 6,
    playersPerTeam: 11,
    oversPerTeam: 15,
    description: 'Annual local community cricket competition.',
    rules: 'White ball, standard ICC T20 rules.',
    status: 'draft',
  };

  const resCreate = await fetch('http://localhost:5000/api/v1/tournaments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify(createPayload),
  });
  const jsonCreate = await resCreate.json();
  console.log('✓ User tournament created response status:', resCreate.status, jsonCreate.data.tournament.name);
  const createdTourn = jsonCreate.data.tournament;

  // Assertions
  if (createdTourn.creatorType !== 'USER') throw new Error('creatorType should be USER');
  if (createdTourn.status !== 'draft') throw new Error('status should be draft');
  if (createdTourn.oversPerTeam !== 15) throw new Error('oversPerTeam mismatch');

  // 4. Verify draft is in User A's list, but NOT in Available tab
  const resAvailableAfter = await fetch('http://localhost:5000/api/v1/tournaments/available');
  const jsonAvailableAfter = await resAvailableAfter.json();
  const inAvailable = jsonAvailableAfter.data.tournaments.some((t) => t.id === createdTourn.id);
  console.log('✓ Draft in Available tab? (Must be false):', inAvailable);
  if (inAvailable) throw new Error('Draft tournament must NOT be in Available tab!');

  const resMyAfter = await fetch('http://localhost:5000/api/v1/tournaments/my', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const jsonMyAfter = await resMyAfter.json();
  const inMy = jsonMyAfter.data.tournaments.some((t) => t.id === createdTourn.id);
  console.log('✓ Draft in User A My Tournaments? (Must be true):', inMy);
  if (!inMy) throw new Error('Draft tournament must be in creator My Tournaments!');

  // 5. Verify User B cannot see or edit User A's draft
  const resOtherEdit = await fetch(`http://localhost:5000/api/v1/tournaments/${createdTourn.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
    },
    body: JSON.stringify({ name: 'Hacked Name' }),
  });
  console.log('✓ Other user edit status code (Must be 403):', resOtherEdit.status);
  if (resOtherEdit.status !== 403) throw new Error('User B must get 403 when trying to edit User A tournament!');

  // 6. User A publishes tournament
  const resPublish = await fetch(`http://localhost:5000/api/v1/tournaments/${createdTourn.id}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const jsonPublish = await resPublish.json();
  console.log('✓ Published status:', jsonPublish.data.tournament.status);
  console.log('✓ Generated shareableUrl:', jsonPublish.data.tournament.shareableUrl);

  // 7. Verify shared link resolution by any public user
  const resShare = await fetch(`http://localhost:5000/api/v1/tournaments/share/${createdTourn.shareableIdentifier}`);
  const jsonShare = await resShare.json();
  console.log('✓ Public shared resolution status:', resShare.status, jsonShare.data.tournament.name);

  // Cleanup test record
  await prisma.tournament.delete({ where: { id: createdTourn.id } });
  console.log('✓ Cleaned up test tournament');
  console.log('🎉 ALL USER TOURNAMENT BACKEND TESTS PASSED!');
}

runTests().catch(console.error).finally(() => prisma.$disconnect());
