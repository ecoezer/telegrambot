import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export function useBets() {
    const [bets, setBets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "bets"), orderBy("timestamp", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const betsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBets(betsData);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    return { bets, loading };
}
