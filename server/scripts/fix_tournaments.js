const prisma = require('../config/prisma');

async function main() {
  const rows = await prisma.$queryRawUnsafe('SELECT * FROM tournaments');
  console.log('Current rows in tournaments table:', rows);

  // If there are rows with NULL number_of_teams, players_per_team, or shareable_identifier, fill them with defaults
  for (const r of rows) {
    const teams = r.number_of_teams || 8;
    const players = r.players_per_team || 11;
    const shareId = r.shareable_identifier || `trnt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    await prisma.$executeRawUnsafe(
      `UPDATE tournaments SET number_of_teams = $1, players_per_team = $2, shareable_identifier = $3 WHERE id = $4`,
      teams, players, shareId, r.id
    );
    console.log(`Updated tournament row ${r.id} with valid values.`);
  }

  const updated = await prisma.$queryRawUnsafe('SELECT * FROM tournaments');
  console.log('Tournaments after fix:', updated);
}

main().catch(console.error).finally(() => prisma.$disconnect());
