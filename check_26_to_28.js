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
  let found = 0;
  snap.forEach(doc => {
    const data = doc.data();
    const d = new Date(data.timestamp);
    if(d >= cutoffStart && d <= cutoffEnd) {
      console.log(`[${data.formattedDate}] ${data.match} | Odds: ${data.odds} | Stake: ${data.stake} | Result: ${data.status} | Source: ${data.source}`);
      found++;
    }
  });
  console.log(`Total found between dates: ${found}`);
  process.exit(0);
}
run();
