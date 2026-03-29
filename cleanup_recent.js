import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
const jsonMatch = process.env.FIREBASE_SERVICE_ACCOUNT.match(/\{[\s\S]*\}/);
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(jsonMatch[0]))
});
const db = admin.firestore();

async function run() {
  const cutoff = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // last 5 days
  const snap = await db.collection('bets').get();
  let deleted = 0;
  for(const doc of snap.docs) {
    const data = doc.data();
    if (new Date(data.timestamp) > cutoff) {
      console.log(`Deleting ${data.match}: Odds ${data.odds}, Stake ${data.stake}`);
      await doc.ref.delete();
      deleted++;
    }
  }
  
  // reset scanner to fetch last messages again
  const metaRef = db.collection('_meta').doc('scanner');
  await metaRef.update({ lastMessageId: 24090 });
  console.log(`Total deleted: ${deleted}. Ready for clean rescan.`);
  process.exit(0);
}
run();
