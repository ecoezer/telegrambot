
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
    { id: '1lymv2VwpqRvpI6PeCDQ', score: '1-7', status: 'win' },   // PSV vs Arsenal (Arsenal Win) => 1-7 => Win
    { id: '2Ia7EIEglx293iY7ZOgC', score: '1-2', status: 'loss' },  // Norway vs Czech (Over 5.5) => 1-2 (3 goals) => Loss
    { id: '2Xhu7vEbITpI86clz1Gd', score: '3-2', status: 'loss' },  // Poland vs Denmark (Under 3) => 3-2 (5 goals) => Loss
    { id: '2gZX9OBNRMG6dEdZHlXh', score: '3-1', status: 'loss' },  // Chelsea vs Liverpool (Under 3.5) => 3-1 (4 goals) => Loss
    // Valencia vs Espanyol skipped
    { id: '3crxCFBrSDC3hvGtO7lD', score: '0-2', status: 'loss' },  // Elfsborg vs Hacken (Elfsborg Win) => 0-2 => Loss
    { id: '3fEnx7lmwYbu02o0kAJS', score: '2-2', status: 'loss' },  // Man City vs Brighton (City Win) => 2-2 => Loss
    { id: '3l8wKaIt3Dyegq1TgP6j', score: '1-3', status: 'loss' },  // Zandschulp +5.5 vs Fokina => 16-23 (-7) => Loss
    { id: '3ybuk2mpQ9SPAXntYGQ5', score: '2-2', status: 'win' },   // Gala vs Alkmaar (Over 3.5) => 2-2 (4 goals) => Win
    { id: '5hGQ5wX79ZQTcC6ENjZp', score: '2-0', status: 'win' }    // Tien vs Opelka (Tien Win) => 2-0 => Win
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
