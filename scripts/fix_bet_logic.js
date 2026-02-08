
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}

const db = admin.firestore();

async function fixBets() {
    if (!fs.existsSync('audit_results.json')) {
        console.error("❌ audit_results.json not found!");
        return;
    }

    const discrepancies = JSON.parse(fs.readFileSync('audit_results.json', 'utf8'));
    console.log(`🚀 Fixing ${discrepancies.length} discrepancies...`);

    const batch = db.batch();

    discrepancies.forEach(item => {
        const docRef = db.collection('bets').doc(item.id);
        const newStatus = item.correct_status;

        console.log(`Updating ${item.match}: ${item.db_status} -> ${newStatus}`);

        batch.update(docRef, {
            status: newStatus,
            resolution_method: 'automated_audit_fix',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });

    await batch.commit();
    console.log(`✅ Successfully updated ${discrepancies.length} bets.`);
}

fixBets().catch(console.error);
