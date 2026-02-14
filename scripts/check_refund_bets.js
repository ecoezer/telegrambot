
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

async function checkBets() {
    console.log("Checking specific bets...");
    const matches = [
        "Canada VS Switzerland",
        "Germany VS Denmark",
        "Tottenham VS Newcastle"
    ];

    for (const match of matches) {
        const snapshot = await db.collection('bets').where('match', '==', match).get();
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`Match: ${data.match}, Status: ${data.status}, Score: ${data.score}`);
        });
    }
    process.exit(0);
}

checkBets();
