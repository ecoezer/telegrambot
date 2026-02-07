import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}

const db = admin.firestore();

async function listMissingOdds() {
    const snapshot = await db.collection('bets').get();
    const missing = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.odds || data.odds === 0) {
            missing.push({
                id: doc.id,
                match: data.match,
                selection: data.selection,
                date: data.formattedDate
            });
        }
    });

    console.log('Bets with missing odds count:', missing.length);
    console.log(JSON.stringify(missing, null, 2));
    process.exit(0);
}

listMissingOdds();
