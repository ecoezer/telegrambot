import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
const jsonMatch = process.env.FIREBASE_SERVICE_ACCOUNT.match(/\{[\s\S]*\}/);
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(jsonMatch[0]))
});
const db = admin.firestore();

async function run() {
  const cutoffStart = new Date('2026-03-25T00:00:00Z');
  const cutoffEnd = new Date('2026-03-30T00:00:00Z');
  
  const snap = await db.collection('bets').orderBy('timestamp', 'desc').get();
  snap.forEach(doc => {
    const data = doc.data();
    const d = new Date(data.timestamp);
    if(d >= cutoffStart && d <= cutoffEnd && data.source === 'YRL_BETS_ACTIONS') {
      console.log('-------------------------');
      console.log(`Bet: ${data.match}`);
      console.log(`RAW TEXT:`);
      console.log(data.raw);
    }
  });
  process.exit(0);
}
run();
