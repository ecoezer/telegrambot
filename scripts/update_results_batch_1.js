
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
    { id: '0M6XYBaEcles40rml6UI', score: '0-0', status: 'loss' }, // Nottingham vs Arsenal (Over 2.5) => 0-0 => Loss
    { id: '0rbAMA9NQAL4nUj24I9l', score: '5-1', status: 'win' },  // Liverpool vs Tottenham (Over 3.5) => 6 => Win
    { id: '18EUlhXE4s6DM60vVkkO', score: '1-0', status: 'win' },  // Atleti vs Botafogo (Atleti Win) => 1-0 => Win
    { id: '1Hvwv7UunAXa6deXDZtP', score: '0-0', status: 'loss' }, // Bilbao vs Osasuna (Bilbao -1) => 0-0 => Loss
    { id: '1Rw6yCrpQ4FnDC0iloxN', score: '2-2', status: 'win' }   // Austria vs Slovakia (Over 2) => 2-2 (4 goals) => Win
];

async function updateBatch() {
    const batch = db.batch();

    updates.forEach(u => {
        const ref = db.collection('bets').doc(u.id);
        batch.update(ref, {
            score: u.score,
            status: u.status
        });
    });

    await batch.commit();
    console.log(`Updated ${updates.length} bets.`);
    process.exit(0);
}

updateBatch();
