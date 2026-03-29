import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
const jsonMatch = process.env.FIREBASE_SERVICE_ACCOUNT.match(/\{[\s\S]*\}/);
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(jsonMatch[0]))
});
const db = admin.firestore();

async function run() {
  const metaRef = db.collection('_meta').doc('scanner');
  await metaRef.update({ lastMessageId: 24100 });
  const snap = await db.collection('bets').where('source', '==', 'YRL_BETS_ACTIONS').get();
  for(const doc of snap.docs) {
    const data = doc.data();
    if (data.odds > 2.0 || data.stake === 1) { // 3.5 and 2.5 are bad
      console.log(`Deleting ${data.match} because odds: ${data.odds}, stake: ${data.stake}`);
      await doc.ref.delete();
    }
  }
  process.exit(0);
}
run();
