import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
const jsonMatch = process.env.FIREBASE_SERVICE_ACCOUNT.match(/\{[\s\S]*\}/);
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(jsonMatch[0]))
});
const db = admin.firestore();

async function run() {
  const snap = await db.collection('bets').get();
  for(const doc of snap.docs) {
    const data = doc.data();
    if (data.match && data.match.includes('Sabalenka')) {
      console.log(`FOUND Sabalenka:`, doc.id, data);
      await doc.ref.delete();
      console.log('DELETED IT.');
    }
    if (data.match && data.match.includes('Crvena Zvezda') && data.match.includes('Barcelona')) {
       console.log(`FOUND Barcelona:`, doc.id, data);
       await doc.ref.delete();
       console.log('DELETED IT.');
    }
  }
  process.exit(0);
}
run();
