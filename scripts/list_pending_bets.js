
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

async function listPending() {
    // Check for 'pending' (lowercase) and 'PENDING' (uppercase) just in case
    const snapshot1 = await db.collection('bets').where('status', '==', 'pending').get();
    const snapshot2 = await db.collection('bets').where('status', '==', 'PENDING').get();

    const allPending = [...snapshot1.docs, ...snapshot2.docs];

    // Deduplicate by ID
    const uniquePending = new Map();
    allPending.forEach(doc => uniquePending.set(doc.id, doc.data()));

    console.log(`Total Pending Bets: ${uniquePending.size}`);

    let count = 0;
    uniquePending.forEach((data, id) => {
        if (count < 20) { // Limit output
            console.log(`ID: ${id} | Match: ${data.match} | Selection: ${data.selection} | Date: ${data.formattedDate || 'Unknown'}`);
            count++;
        }
    });

    process.exit(0);
}

listPending();
