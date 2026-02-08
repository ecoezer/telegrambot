import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}

const db = admin.firestore();

const resolutions = [
    { id: 'm2EYYW5VPKG9994Gk5bG', match: 'Wolves VS Chelsea', status: 'win' },
    { id: 'n3b3aPYkIi3jgCMzUHRs', match: 'Nice VS Montpellier', status: 'win' },
    { id: 'jR6AYAxV4b2BnL3CDjB4', match: 'Arsenal VS Man United', status: 'loss' },
    { id: 'dx3ewLsCQ53UfUFayEM5', match: 'Girona VS Getafe', status: 'win' },
    { id: 'mCKH7KLkih0trAjihDfN', match: 'Celta De Vigo VS Rayo', status: 'loss' },
    { id: 'g9Z1sOHYF31FMV2xpWyY', match: 'Como VS Milan', status: 'win' },
    { id: 'ZxGQjzmLwq7P3jpAAqs5', match: 'Juventus VS Cremonese', status: 'win' },
    { id: 'z64q9Df9LZsYfEqYZHIA', match: 'Arsenal VS Liverpool', status: 'loss' },
    { id: 'q1giZDub0qF2KJjUvIC7', match: 'ASVEL VS Real Madrid', status: 'win' },
    { id: 'z7rtxfHHLHYqKnud1rZN', match: 'Efes VS Zvezda', status: 'loss' }
];

async function resolveBets() {
    for (const res of resolutions) {
        const docRef = db.collection('bets').doc(res.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            console.log(`❌ Bet ${res.id} not found.`);
            continue;
        }

        const data = doc.data();
        const odds = data.odds || 0;
        const stake = data.stake || 1;
        const resultAmount = res.status === 'win' ? (stake * odds) : 0;

        await docRef.update({
            status: res.status,
            resultAmount: resultAmount
        });

        console.log(`✅ Result: ${res.match} -> ${res.status.toUpperCase()} (Payout: ${resultAmount})`);
    }
}

resolveBets().catch(console.error);
