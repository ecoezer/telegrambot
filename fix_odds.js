import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
const jsonMatch = process.env.FIREBASE_SERVICE_ACCOUNT.match(/\{[\s\S]*\}/);
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(jsonMatch[0]))
});
const db = admin.firestore();

async function run() {
  const snap = await db.collection('bets').where('source', '==', 'YRL_BETS_ACTIONS').get();
  let deleted = 0;
  for(const doc of snap.docs) {
    const data = doc.data();
    if (data.odds === 0 || data.stake === 1) {
      console.log(`Deleting ${data.match} as odds is 0 or stake is 1`);
      await doc.ref.delete();
      deleted++;
    }
  }
  
  // also reset lastMessageId so scan.js scans again
  const metaRef = db.collection('_meta').doc('scanner');
  const metaDoc = await metaRef.get();
  if (metaDoc.exists) {
    const currentId = metaDoc.data().lastMessageId;
    await metaRef.update({ lastMessageId: currentId - 50 }); // go back 50 messages
    console.log("Reset message ID by 50");
  }
  process.exit(0);
}
run();
