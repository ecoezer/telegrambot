import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 🚀 MANUAL RESOLUTION TOOL
 * 
 * Paste your results in the 'resolutions' array below.
 * Status options: 'win' or 'loss'
 * 
 * Usage: node scripts/manual_resolve.js
 */

const resolutions = [
    { id: 'm2EYYW5VPKG9994Gk5bG', status: 'win', score: '1-3' },
    // { id: 'BET_ID_HERE', status: 'win', score: '2-1' },
    // { id: 'BET_ID_HERE', status: 'loss', score: '0-1' },
];

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}

const db = admin.firestore();

async function resolveBets() {
    if (resolutions.length === 0) {
        console.log("⚠️ No resolutions provided. Please edit the 'resolutions' array in this script.");
        return;
    }

    console.log(`⏳ Resolving ${resolutions.length} bets...`);

    for (const res of resolutions) {
        if (!res.id || !res.status) {
            console.log(`❌ Invalid entry: ${JSON.stringify(res)}`);
            continue;
        }

        const docRef = db.collection('bets').doc(res.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            console.log(`❌ Bet ID not found: ${res.id}`);
            continue;
        }

        const data = doc.data();
        const odds = data.odds || 0;
        const stake = data.stake || 1;
        const resultAmount = res.status.toLowerCase() === 'win' ? (stake * odds) : 0;

        const updateObj = {
            status: res.status.toLowerCase(),
            resultAmount: resultAmount,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (res.score) {
            updateObj.score = res.score;
        }

        await docRef.update(updateObj);

        console.log(`✅ [${res.id}] ${data.match} -> ${res.status.toUpperCase()} (${resultAmount}€)`);
    }

    console.log("\n✨ Done! Check your Dashboard.");
}

resolveBets().catch(console.error);
