import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const resolutions = [
    { id: '4Hy1CGW6HqRqO5oipm8T', match: 'Serbia VS Estonia', status: 'loss', score: '98-64' },
    { id: '5ZQ4SdcmbJ0ZOwmtACwL', match: 'Kym VS Hemery', status: 'loss', score: '2-1' },
    { id: '5m2pFYrynkMt2w3xbFzz', match: 'Man United VS Newcastle', status: 'loss', score: '1-0' },
    { id: '60xLbC5VVyD4NOAGaMZw', match: 'Brighton VS Fulham', status: 'win', score: '1-1' },
    { id: '6I0DU0i0fHAOjL6hZQ1W', match: 'Man United VS Arsenal', status: 'loss', score: '0-1' },
    { id: '6UYaDlErHzgpachun0se', match: 'Olympiacos VS Valencia', status: 'loss', score: '92-99' },
    { id: '6dVCmbRTIXSQq38w7XFe', match: 'Tottenham VS Liverpool', status: 'win', score: '1-2' },
    { id: '6ri6Hjm7OlkkxtUmS9jn', match: 'Crystal Palace VS Brentford', status: 'loss', score: '2-0' },
    { id: '6wiAzvPJxdFFe3ZlCAgc', match: 'Porto VS Rangers', status: 'loss', score: '3-1' },
    { id: '7OxfVzKWjQbm7pkX5Oji', match: 'Tiafoe VS Rune', status: 'loss', score: '4-6, 1-3 ret.' },
    { id: '8jGDF0eOxv8z0VopX7Xg', match: 'Dortmund VS Bodo/Glimt', status: 'win', score: '2-2' },
    { id: '6NSGuTZXtNzeMRrOSFrX', match: 'Fenerbahce VS Stuttgart', status: 'loss', score: '1-0' },
    { id: '7VaHLV05Hg1VQblWRD5T', match: 'Sevilla VS Elche', status: 'win', score: '2-2' },
    { id: '9357Z9yk5uHHlF9azZdl', match: 'Sunderland VS Everton', status: 'win', score: '1-1' },
    { id: '4k40pn2mE5TkMT8mdnov', match: 'Brentford VS Leeds', status: 'loss', score: '1-1' }
];

async function resolveBets() {
    for (const res of resolutions) {
        const docRef = db.collection('bets').doc(res.id);
        const doc = await docRef.get();
        if (!doc.exists) continue;
        const data = doc.data();
        const odds = data.odds || 0;
        const stake = data.stake || 1;
        const resultAmount = res.status === 'win' ? (stake * odds) : 0;
        await docRef.update({
            status: res.status,
            resultAmount: resultAmount,
            score: res.score,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ [${res.id}] ${res.match} -> ${res.status.toUpperCase()} (${res.score})`);
    }
    console.log("🚀 Batch 8 Resolved.");
}
resolveBets().catch(console.error);
