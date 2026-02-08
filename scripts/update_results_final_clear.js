import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const resolutions = [
    { id: 'QbOqvNpEdTkhrd6voE7P', match: 'Aston Villa VS Man United', status: 'loss', score: '2-1' },
    { id: 'Rt1VsZwacad2mG66JGA7', match: 'Marseille VS Liverpool', status: 'win', score: '0-3' },
    { id: 'xMb3NZijxjEny6LhwL7g', match: 'Man City VS Liverpool', status: 'win', score: '3-0' },
    { id: 'zyi0tjZQQQQgt2R03RcN', match: 'Crystal Palace VS Tottenham', status: 'loss', score: '0-1' },
    { id: 'x69lxDAM34p743MNaRIW', match: 'Barcelona VS Real Sociedad', status: 'loss', score: '2-1' },
    { id: 'tOFyQzCxOtXBk4l3un8L', match: 'Man City VS Everton', status: 'loss', score: '2-0' },
    { id: 'vAH3MH3yFgnYbM64JEXI', match: 'Alcaraz VS Auger', status: 'win', score: '6-2, 6-4' },
    { id: 'jQfChsLRVQYTRCivkcog', match: 'Cobolli VS Galerneau', status: 'loss', score: '6-4, 5-7, 6-4' },
    { id: 'nBSmtrz6ZeLtDF1lEMsS', match: 'Lamens VS Kudermetova', status: 'win', score: '2-1' },
    { id: 'wQNVIExTIpbXVUvVAVd9', match: 'Gaston VS Gombos', status: 'loss', score: '0-2' },
    { id: 'mbNr4VU1yliE7BHBU8TK', match: 'Malta VS Poland', status: 'win', score: '2-3' },
    { id: 'y0b7Y2YITQvomic76hJy', Israel: 'VS Slovenia', status: 'loss', score: '96-106' },
    { id: 'gAqwfkJPxJPq6AxaU4PT', match: 'Galatasaray VS Bodo/Glimt', status: 'win', score: '3-1' },
    { id: 'fiLqIsxIiKDoXIn6rnL6', match: 'Fredrikstad VS Midtjylland', status: 'win', score: '1-3' },
    { id: 'gQl7APt655wqvYReOYjy', match: 'Crvena Zvezda VS Dubai', status: 'win', score: '95-92' },
    { id: 'N7jLrsGEH6Nh4HWl9P7r', match: 'ASVEL VS Barcelona', status: 'win', score: '91-98' },
    { id: 'ZKru4IStUQKc3TZ9XAXH', match: 'Topuria VS Almakhan', status: 'win', score: '30-27' },
    { id: 'ulR72R0ryeIjxXkTj5tD', match: 'Bulgaria VS Cuba', status: 'win', score: '2-3' }
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
        console.log(`✅ [${res.id}] ${res.match || res.id} -> ${res.status.toUpperCase()} (${res.score})`);
    }
    console.log("🚀 Backlog Cleared.");
}
resolveBets().catch(console.error);
