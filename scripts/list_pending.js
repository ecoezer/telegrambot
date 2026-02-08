import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}

const db = admin.firestore();

async function listPending() {
    console.log("🔍 Fetching pending bets...");
    const snapshot = await db.collection('bets').where('status', '==', 'pending').get();

    if (snapshot.empty) {
        console.log("✅ No pending bets found.");
        return;
    }

    console.log(`📋 Found ${snapshot.size} pending bets:`);
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- [${doc.id}] ${data.match} | Selection: ${data.selection} | Date: ${data.formattedDate}`);
    });
}

listPending().catch(console.error);
