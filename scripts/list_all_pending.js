
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

async function listAllPending() {
    console.log("Fetching ALL pending bets...");
    const snapshot = await db.collection('bets').get();

    const pending = [];

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

            pending.push({
                id: doc.id,
                match: data.match,
                selection: data.selection,
                date: betDate,
                formattedDate: data.formattedDate,
                status: data.status // keep original casing for debug
            });
        }
    });

    // Sort by date 
    pending.sort((a, b) => (a.date || 0) - (b.date || 0));

    console.log(`Found ${pending.length} TOTAL pending bets:`);
    pending.forEach(p => {
        const dateStr = p.date ? p.date.toISOString().split('T')[0] : (p.formattedDate || 'No Date');
        console.log(`[${dateStr}] ${p.match} -- ${p.selection} (ID: ${p.id})`);
    });

    process.exit(0);
}

listAllPending();
