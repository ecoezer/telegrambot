
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
        });
    }
}

const db = admin.firestore();

const updates = [
    { id: 'ANsJR8ZcUcmQHAOSyBwy', score: '2-0', status: 'win' },  // Swiatek (-3.5) vs Collins => 6-2 6-3 => 12-5 (+7 games) => Win
    { id: 'AfLj0JbUKfScPi45glmQ', score: '3-3', status: 'win' },  // Leipzig vs Bayern (Over 3.5) => 6 goals => Win
    { id: 'B9BNxY7yIA88oE7qocWe', score: '2-1', status: 'loss' }, // Medvedev (-2.5 games) vs Nakashima => (3-6, 6-1, 6-4) => 15-11 (+4 games). Capable? Yes. Wait, 15-11 = +4. -2.5 handicap => 12.5 > 11. WIN. (Medvedev won by 4 games). 
    // Correction: Medvedev won 15-11. 15 - 2.5 = 12.5. 12.5 > 11. Status is WIN. 
    // Previous line had logic error in comment or thought? Let's verify. 3-6 (3-6), 6-1 (9-7), 6-4 (15-11). Delta +4. Handicap -2.5 covered. Win.
    // Changing status to WIN.

    { id: 'Bk6LlA2fGVWZ32rMtN9l', score: '2-1', status: 'loss' }, // Betis vs Real Madrid (Madrid Win) => Betis won 2-1 => Loss
    { id: 'C0SBHsGGAoN1Xbcpq8ze', score: '2-1', status: 'win' },  // Finland vs Poland (BTTS Yes) => 2-1 => Win
    { id: 'C8r7wn84JjOOMeFzjAnT', score: '72-78', status: 'win' }, // Crvena Zvezda vs Real Madrid (Madrid Win) => 72-78 => Win
    { id: 'CQtKniYsBWo9PNgfejks', score: '3-0', status: 'loss' }, // Tiafoe vs Korda (Korda Win) => Tiafoe Won 3-0 => Loss
    // Aston Villa vs Nottingham skipped (Future)
    { id: 'DstML8PTsnmRB8Bpepz5', score: '6-1', status: 'loss' }, // Czech vs Hungary (Under 6.5) => 7 goals => Loss
    // Zverev vs Fils skipped (Future/Unknown)
];

// Correction for Medvedev: 
// Win logic: (PlayerGames - Handicap) > OpponentGames ?
// Medvedev (-2.5). 15 - 2.5 = 12.5. Nakashima = 11. 12.5 > 11. Win.
// Updating array to reflect WIN for Medvedev.

// Array update below:
const correctUpdates = [
    { id: 'ANsJR8ZcUcmQHAOSyBwy', score: '2-0', status: 'win' },
    { id: 'AfLj0JbUKfScPi45glmQ', score: '3-3', status: 'win' },
    { id: 'B9BNxY7yIA88oE7qocWe', score: '2-1', status: 'win' },
    { id: 'Bk6LlA2fGVWZ32rMtN9l', score: '2-1', status: 'loss' },
    { id: 'C0SBHsGGAoN1Xbcpq8ze', score: '2-1', status: 'win' },
    { id: 'C8r7wn84JjOOMeFzjAnT', score: '72-78', status: 'win' },
    { id: 'CQtKniYsBWo9PNgfejks', score: '3-0', status: 'loss' },
    { id: 'DstML8PTsnmRB8Bpepz5', score: '6-1', status: 'loss' }
];

async function updateBatch() {
    const batch = db.batch();

    correctUpdates.forEach(u => {
        const ref = db.collection('bets').doc(u.id);
        batch.update(ref, {
            score: u.score,
            status: u.status
        });
    });

    await batch.commit();
    console.log(`Updated ${correctUpdates.length} bets.`);
    process.exit(0);
}

updateBatch();
