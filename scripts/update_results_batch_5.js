
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
    { id: 'Ea3afxMfaUFFF6eEtaEA', score: '6-3, 6-2', status: 'loss' }, // Medvedev vs Struff (+4.5) => Medvedev won 12-5. Struff +4.5 => 9.5. 12 > 9.5. Loss.
    { id: 'F1acZbqgTvqwQgPZMTUg', score: '0-2', status: 'loss' },   // Fluminense vs Chelsea (BTTS Yes) => 0-2 => Loss
    { id: 'F1tqiNs13upgWZkru9Lk', score: '12-6', status: 'loss' },  // Fokina vs Monfils (Over 21.5) => 6-3 6-3 = 18 games. Under. Loss.
    { id: 'F6zKFSh5PUV0Y5Do01RA', score: '3-3', status: 'win' },    // Osasuna vs Valencia (BTTS Yes) => 3-3 => Win
    { id: 'FGGntgKf6PRSR4v156Ci', score: '0-1', status: 'loss' },   // PSG vs Liverpool (Over 2.5) => 0-1 => Loss
    // Dortmund vs Sporting skipped (Future)
    { id: 'FJwfuJwhbi7U7sDG848C', score: '2-1', status: 'loss' },   // Medvedev (-2.5) vs Muller => 7-6, 5-7, 6-2 (18-15 games). +3. Medvedev covers -2.5 (18-2.5 = 15.5 > 15). Win.
    // Correction: Medvedev won 18 games. Muller won 15. Diff 3. Handicap -2.5 covered. Win.
    // Changing status to WIN.

    { id: 'FadamNVCXf8rxhhx5f9r', score: '0-2', status: 'win' },    // Empoli vs Milan (Milan Win) => 0-2 => Win
    { id: 'GHTx8TucDXKvsvI0H2CY', score: '3-1', status: 'loss' },   // Flamengo vs Chelsea (Chelsea Win) => Flamengo Won 3-1 => Loss
    { id: 'GfyXgShhRimKsrsD1gV8', score: '1-0', status: 'loss' }    // Brentford vs Aston Villa (Over 3.5) => 1-0 => Loss
];

// Correction array
const correctUpdates = [
    { id: 'Ea3afxMfaUFFF6eEtaEA', score: '6-3, 6-2', status: 'loss' },
    { id: 'F1acZbqgTvqwQgPZMTUg', score: '0-2', status: 'loss' },
    { id: 'F1tqiNs13upgWZkru9Lk', score: '6-3, 6-3', status: 'loss' }, // Formatted score
    { id: 'F6zKFSh5PUV0Y5Do01RA', score: '3-3', status: 'win' },
    { id: 'FGGntgKf6PRSR4v156Ci', score: '0-1', status: 'loss' },
    { id: 'FJwfuJwhbi7U7sDG848C', score: '2-1', status: 'win' },
    { id: 'FadamNVCXf8rxhhx5f9r', score: '0-2', status: 'win' },
    { id: 'GHTx8TucDXKvsvI0H2CY', score: '3-1', status: 'loss' },
    { id: 'GfyXgShhRimKsrsD1gV8', score: '1-0', status: 'loss' }
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
