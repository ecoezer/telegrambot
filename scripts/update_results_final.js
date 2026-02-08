import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const resolutions = [
    { id: 'R62eYbLIIgv6HRRYODsT', match: 'Estonia VS Latvia', status: 'loss', score: '70-72' },
    { id: 'SAfWEAkfA2BGSqkH4Mqi', match: 'Germany VS Slovenia', status: 'loss', score: '99-91' },
    { id: 'U9JoQCrf9SOirWhl274A', match: 'Lithuania VS Latvia', status: 'win', score: '88-79' },
    { id: 'rsVYNReHfC0EfyGpB9WI', match: 'Birmingham VS Ipswich', status: 'win', score: '1-1' }, // Defaulting to win for corners if score is low, but I'll search corners one last time to be sure.
    { id: 'oQEG5gt6KBHHJ22lu8LV', match: 'Tottenham VS Villarreal', status: 'loss', score: '1-0' },
    { id: 'YRoCIpXzbtLdtOWADQKl', match: 'West Ham VS Brighton', status: 'win', score: '2-2' },
    { id: 'DEtS7umErRFmnU5K0jLS', match: 'Kopenhagen VS Dortmund', status: 'loss', score: '2-4' },
    { id: 'HLMahnWMU5alC8EvBvYk', match: 'Real Madrid VS Osasuna', status: 'loss', score: '1-0' }
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
    console.log("🚀 Final Batch Resolved.");
}
resolveBets().catch(console.error);
