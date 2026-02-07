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

const fixData = async () => {
    console.log("🧹 Clearing current bets for a fresh re-scan...");
    const snapshot = await db.collection('bets').get();

    if (snapshot.empty) {
        console.log("No bets found to delete.");
        return;
    }

    const batchSize = 400;
    let count = 0;

    for (let i = 0; i < snapshot.size; i += batchSize) {
        const batch = db.batch();
        const chunk = snapshot.docs.slice(i, i + batchSize);
        chunk.forEach(doc => {
            batch.delete(doc.ref);
            count++;
        });
        await batch.commit();
        console.log(`Deleted ${count} / ${snapshot.size}...`);
    }

    console.log(`✅ Cleared all bets.`);
};

fixData().catch(console.error);
