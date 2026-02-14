
import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}

const db = admin.firestore();

async function checkBet() {
    console.log("Checking bet z64q9Df9LZsYfEqYZHIA...");
    const doc = await db.collection('bets').doc('z64q9Df9LZsYfEqYZHIA').get();
    if (doc.exists) {
        console.log("Bet Data:", doc.data());
    } else {
        console.log("Bet not found!");
    }
}

checkBet().catch(console.error);
