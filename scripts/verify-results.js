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

const verifyResults = async () => {
    console.log("🔍 Fetching pending bets for verification...");
    const snapshot = await db.collection('bets')
        .where('status', '==', 'pending')
        .get();

    if (snapshot.empty) {
        console.log("✨ No pending bets found.");
        return;
    }

    console.log(`📋 Found ${snapshot.size} bets to verify.`);

    // In a real production app, you might use a Sports API (e.g. API-Football).
    // For this demonstration, we'll print the query for the Agent to verify.
    snapshot.forEach(doc => {
        const bet = doc.data();
        console.log(`--- [PENDING] ${bet.match} (${bet.formattedDate}) ---`);
        console.log(`Search Query: "${bet.match} score ${bet.formattedDate}"`);
    });

    console.log("\n💡 Next Step: I will use the search_web tool to find these results and update Firestore.");
};

// This second function can be called by the agent with a results object
export const updateBetStatuses = async (results) => {
    const batch = db.batch();
    for (const [id, status] of Object.entries(results)) {
        const ref = db.collection('bets').doc(id);
        batch.update(ref, {
            status: status, // "WIN", "LOSS", "PUSH", "VOID"
            lastVerified: new Date().toISOString()
        });
    }
    await batch.commit();
    console.log(`✅ Updated ${Object.keys(results).length} bet statuses.`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    verifyResults().catch(console.error);
}
