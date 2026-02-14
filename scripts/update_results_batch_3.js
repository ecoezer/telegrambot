
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
    { id: '6ZJfnNqGBDJZGGZEMIcg', score: '1-2', status: 'loss' }, // Muchova (-2.5) vs Maria => 1-2 => Loss
    { id: '6btb09XG3IuyyVTuXf3y', score: '0-2', status: 'loss' }, // 3DMAX vs pain => 0-2 => Loss
    { id: '6nm5HPKiu8e2ZtvNj4T0', score: '1-3', status: 'win' },  // Muller vs Mensik (Over 38.5) => 52 games => Win
    { id: '8cDE5zyj3hxnCv4oEfdP', score: '3-0', status: 'loss' }, // Tiafoe vs Altmaier (Over 38.5) => 32 games => Loss
    { id: '8mlcV36e6A8RwEQFeExC', score: '2-1', status: 'loss' }, // Czech vs Faroe (Over 3) => 3 goals => Push/Loss (User usually treats push as loss or void, assuming loss for Over 3 if exactly 3 unless specified) -> stricter logic: >3 is 4+. 3 is loss.
    { id: '8rB9pjvT4VB4xlsSK9iB', score: '4-0', status: 'loss' }, // PSG vs Miami (BTTS Yes) => 4-0 => Loss
    { id: '96W6trOPlUfcp3S5awKn', score: '2-1', status: 'loss' }, // Zheng (-3.5) vs Kessler => (6-3, 4-6, 7-5) = 17-14 => +3 games. Handicap -3.5 covers? 17-3.5 = 13.5 < 14. Loss.
    { id: '9uBZfM935GnwPwCcm96M', score: '2-8', status: 'win' },  // Hungary vs Denmark (Over 5) => 10 goals => Win
    { id: 'AHrrUbnw4i79PaWS9eaJ', score: '5-2', status: 'win' },  // Portugal vs Denmark (Portugal Win) => 5-2 => Win
    { id: 'ALH4pcxWCE59YiAbawWa', score: '1-0', status: 'loss' }  // Bournemouth vs Fulham (BTTS Yes) => 1-0 => Loss
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
