import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config();

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("Missing FIREBASE_SERVICE_ACCOUNT");
    process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const email = 'admin@bettracker.com';
const password = 'password123';

admin.auth().createUser({
    email: email,
    password: password,
    emailVerified: true,
    disabled: false
})
    .then((userRecord) => {
        console.log('Successfully created new user:', userRecord.uid);
        console.log('Email:', email);
        console.log('Password:', password);
    })
    .catch((error) => {
        if (error.code === 'auth/email-already-exists') {
            console.log('User already exists. You can log in with:');
            console.log('Email:', email);
            console.log('Password:', password);
        } else {
            console.error('Error creating new user:', error);
        }
    });
