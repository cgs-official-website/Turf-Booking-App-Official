const prisma = require('../config/prisma');

async function runTest() {
  console.log('=== STARTING MATCH PERSISTENCE & LAST MAN TEST ===');

  try {
    // 1. Get or create a test user
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: 'test_user_persistence',
          name: 'Test Player',
          email: 'test_player@example.com',
        },
      });
    }
    const uid = user.id;

    // 2. Create a match
    const matchId = `match_test_${Date.now()}`;
    const joinCode = 'TEST01';
    const place = 'Elite Arena';
    const sport = 'Cricket';

    const initialMatch = await prisma.match.create({
      data: {
        id: matchId,
        createdBy: uid,
        creatorName: user.name,
        joinCode,
        place,
        sport,
        matchDate: '2026-10-07',
        matchTime: '18:00',
        playWithStrangers: false,
        teams: {
          A: { name: 'Team Alpha', playerIds: [uid, 'player_2'] },
          B: { name: 'Team Beta', playerIds: ['player_3', 'player_4'] },
        },
        toss: { wonBy: 'A', decision: 'bat', lastManEnabled: true },
        scorecard: {
          innings: [
            {
              battingTeam: 'A',
              bowlingTeam: 'B',
              totalRuns: 120,
              wickets: 6,
              legalBalls: 36,
              completed: true,
            },
            {
              battingTeam: 'B',
              bowlingTeam: 'A',
              totalRuns: 115,
              wickets: 8,
              legalBalls: 36,
              completed: true,
            },
          ],
          resultText: 'Team Alpha won by 5 runs',
          lastManEnabled: true,
        },
        status: 'completed',
        players: {
          create: [{ userId: uid }],
        },
      },
      include: { players: true },
    });

    console.log('✅ Created completed match:', initialMatch.id, 'Status:', initialMatch.status);

    // 3. Query match by ID
    const foundMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: { players: true },
    });

    if (!foundMatch || foundMatch.status !== 'completed') {
      throw new Error('Failed to query completed match from PostgreSQL');
    }
    console.log('✅ Found match in PostgreSQL. Status:', foundMatch.status);

    // 4. Query user's matches (simulate getMyMatches)
    const userMatches = await prisma.match.findMany({
      where: {
        OR: [
          { createdBy: uid },
          { players: { some: { userId: uid } } },
        ],
        status: 'completed',
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('✅ User past completed matches count:', userMatches.length);

    const testMatchInList = userMatches.find((m) => m.id === matchId);
    if (!testMatchInList) {
      throw new Error('Completed match not present in user past matches list');
    }

    console.log('✅ Verified past match in list:', {
      id: testMatchInList.id,
      sport: testMatchInList.sport,
      place: testMatchInList.place,
      status: testMatchInList.status,
      resultText: testMatchInList.scorecard?.resultText,
      lastManEnabled: testMatchInList.toss?.lastManEnabled,
    });

    // Clean up test record
    await prisma.matchPlayer.deleteMany({ where: { matchId } });
    await prisma.match.delete({ where: { id: matchId } });
    console.log('✅ Cleaned up test record.');

    console.log('=== MATCH PERSISTENCE & LAST MAN TEST PASSED SUCCESSFUL ===');
  } catch (err) {
    console.error('❌ Match test failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
