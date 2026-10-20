/**
 * Remove duplicate tournaments created by retried POST requests.
 *
 * Duplicate = same creator type + creator + turf + name (case-insensitive) + start/end date.
 * Keeps ONE row per group: the one that has registrations, else the oldest.
 * Rows that have registrations are never deleted.
 *
 * Usage (dry run, only prints):   node scripts/cleanDuplicateTournaments.js
 * Usage (really delete):          node scripts/cleanDuplicateTournaments.js --apply
 *
 * To run against Railway production from your PC, use the DATABASE_PUBLIC_URL value:
 *   DATABASE_URL="postgresql://...rlwy.net:PORT/railway" node scripts/cleanDuplicateTournaments.js
 */
const prisma = require('../config/prisma');

(async () => {
    const apply = process.argv.includes('--apply');
    const all = await prisma.tournament.findMany({
        include: { _count: { select: { registrations: true } } },
        orderBy: { createdAt: 'asc' },
    });

    const groups = new Map();
    for (const t of all) {
        const key = [
            t.creatorType,
            t.userId || t.vendorId || '',
            t.turfId || '',
            String(t.name).trim().toLowerCase(),
            t.startDate,
            t.endDate,
        ].join('|');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(t);
    }

    const toDelete = [];
    for (const rows of groups.values()) {
        if (rows.length < 2) continue;
        const keeper = rows.find((r) => r._count.registrations > 0) || rows[0];
        for (const r of rows) {
            if (r.id === keeper.id) continue;
            if (r._count.registrations > 0) {
                console.log(`SKIP  ${r.id} "${r.name}" has registrations`);
                continue;
            }
            toDelete.push(r);
            console.log(`${apply ? 'DELETE' : 'WOULD DELETE'}  ${r.id} "${r.name}" (${r.status}, created ${r.createdAt.toISOString()})  keeping ${keeper.id}`);
        }
    }

    if (!toDelete.length) {
        console.log('No duplicate tournaments found.');
    } else if (apply) {
        const res = await prisma.tournament.deleteMany({ where: { id: { in: toDelete.map((r) => r.id) } } });
        console.log(`Deleted ${res.count} duplicate tournament(s).`);
    } else {
        console.log(`\n${toDelete.length} duplicate(s) found. Re-run with --apply to delete them.`);
    }
    await prisma.$disconnect();
})().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
