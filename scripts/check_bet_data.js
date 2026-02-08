import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
        });
    } else {
        console.error("❌ CRITICAL: FIREBASE_SERVICE_ACCOUNT missing locally.");
        process.exit(1);
    }
}
const db = admin.firestore();

const checkBets = async () => {
    console.log("🔍 Checking recent bets for Odds/Stake data...");

    // Check specific matches the user circled
    const matches = ['Dortmund', 'Juventus', 'Inter', 'Atalanta', 'Eintracht'];

    for (const matchName of matches) {
        const snapshot = await db.collection('bets')
            .where('match', '>=', matchName)
            .where('match', '<=', matchName + '\uf8ff')
            .get();

        if (snapshot.empty) {
            // Try searching text search if exact match fails (Firestore simple query limitation)
            // Just get all and filter locally for this debug script
            continue;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`--------------------------------------------------`);
            console.log(`Match: ${data.match}`);
            console.log(`Selection: ${data.selection}`);
            console.log(`Odds: ${data.odds}`);
            console.log(`Stake: ${data.stake}`);
            console.log(`Source: ${data.source}`);
            console.log(`Date: ${data.formattedDate}`);
            console.log(`--------------------------------------------------`);
        });
    }

    // Also just list the last 10 bets generally
    console.log("\n--- LAST 10 BETS ---");
    const lastBets = await db.collection('bets').orderBy('timestamp', 'desc').limit(10).get();
    lastBets.forEach(doc => {
        const data = doc.data();
        console.log(`[${data.formattedDate}] ${data.match} | Odds: ${data.odds} | Stake: ${data.stake}`);
    });

    process.exit(0);
};

checkBets().catch(console.error);
