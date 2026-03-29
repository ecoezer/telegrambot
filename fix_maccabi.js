import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
const jsonMatch = process.env.FIREBASE_SERVICE_ACCOUNT.match(/\{[\s\S]*\}/);
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(jsonMatch[0]))
});
const db = admin.firestore();

async function run() {
  const snap = await db.collection('bets').where('match', '==', 'Maccabi VS Dubai').get();
  for(const doc of snap.docs) {
    console.log(`Deleting Maccabi:`, doc.data());
    await doc.ref.delete();
  }

  // Set message ID back to force re-scan for Maccabi
  const metaRef = db.collection('_meta').doc('scanner');
  await metaRef.update({ lastMessageId: 24090 });
  
  process.exit(0);
}
run();
