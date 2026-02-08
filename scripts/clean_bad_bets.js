import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Firebase
if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
        });
    } else {
        console.error("❌ CRITICAL: FIREBASE_SERVICE_ACCOUNT missing locally.");
        // Try to verify if it's just not loaded or what detailed error we have
        process.exit(1);
    }
}
const db = admin.firestore();

const deleteBadBets = async () => {
    console.log("🚨 STARTING EMERGENCY DB CLEANUP (ESM/Env) 🚨");

    // 1. Delete bets from the History Scan
    const historySnapshot = await db.collection('bets')
        .where('source', '==', 'YRL_BETS_HISTORY')
        .get();

    console.log(`🗑️  Found ${historySnapshot.size} bets from History Scan to delete.`);

    const batchSize = 400;
    let batch = db.batch();
    let count = 0;
    let deletedCount = 0;

    for (const doc of historySnapshot.docs) {
        batch.delete(doc.ref);
        count++;
        deletedCount++;

        if (count >= batchSize) {
            await batch.commit();
            console.log(`🔥 Deleted batch of ${count} bets...`);
            batch = db.batch();
            count = 0;
        }
    }
    if (count > 0) {
        await batch.commit();
    }
    console.log(`✅ Deleted ${deletedCount} history scan bets.`);

    // 2. Delete bets from live OCR that look wrong
    const ocrSnapshot = await db.collection('bets')
        .where('source', '==', 'OCR')
        .get();

    console.log(`🔍 Checking ${ocrSnapshot.size} live OCR bets for anomalies...`);

    batch = db.batch();
    count = 0;
    let anomalyCount = 0;

    for (const doc of ocrSnapshot.docs) {
        const data = doc.data();
        let shouldDelete = false;

        if (data.odds > 50) shouldDelete = true;
        if (data.match && (data.match.includes("Unknown") || data.match.includes("Bet Slip"))) shouldDelete = true;

        if (shouldDelete) {
            console.log(`🗑️  Deleting Anomaly: ${data.match} (Odds: ${data.odds})`);
            batch.delete(doc.ref);
            count++;
            anomalyCount++;
        }

        if (count >= batchSize) {
            await batch.commit();
            batch = db.batch();
            count = 0;
        }
    }
    if (count > 0) {
        await batch.commit();
    }

    console.log(`✅ Deleted ${anomalyCount} anomalous live OCR bets.`);
    console.log("🏁 Cleanup Complete. Database should be clean.");
    process.exit(0);
};

deleteBadBets().catch(console.error);
