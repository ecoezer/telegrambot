
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

async function listPending2026() {
    console.log("Fetching pending bets for 2026...");
    const snapshot = await db.collection('bets').get();

    const pending = [];
    const now = new Date(); // Feb 14, 2026

    snapshot.forEach(doc => {
        const data = doc.data();
        const status = (data.status || 'pending').toLowerCase();

        if (status === 'pending') {
            let betDate;
            if (data.timestamp && data.timestamp._seconds) {
                betDate = new Date(data.timestamp._seconds * 1000);
            } else if (data.formattedDate) {
                betDate = new Date(data.formattedDate);
            }

            // Filter for 2026
            if (betDate && betDate.getFullYear() === 2026) {
                pending.push({
                    id: doc.id,
                    match: data.match,
                    selection: data.selection,
                    date: betDate,
                    formattedDate: data.formattedDate,
                    timestamp: data.timestamp
                });
            }
        }
    });

    // Sort by date 
    pending.sort((a, b) => a.date - b.date);

    console.log(`Found ${pending.length} pending bets in 2026:`);
    pending.forEach(p => {
        console.log(`[${p.date.toISOString().split('T')[0]}] ${p.match} -- ${p.selection} (ID: ${p.id})`);
    });

    process.exit(0);
}

listPending2026();
