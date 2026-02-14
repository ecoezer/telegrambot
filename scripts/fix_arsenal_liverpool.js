
import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}

const db = admin.firestore();

async function fixBet() {
    console.log("Fixing bet z64q9Df9LZsYfEqYZHIA...");
    const docRef = db.collection('bets').doc('z64q9Df9LZsYfEqYZHIA');
    await docRef.update({
        score: "0-0"
    });
    console.log("✅ Updated score to 0-0");
}

fixBet().catch(console.error);
