import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function hasMissingFirebaseConfig() {
  return Object.values(firebaseConfig).some((value) => !value);
}

let firebaseApp: FirebaseApp;

if (getApps().length > 0) {
  firebaseApp = getApp();
} else {
  if (hasMissingFirebaseConfig()) {
    throw new Error("Missing Firebase environment variables.");
  }

  firebaseApp = initializeApp(firebaseConfig);
}

export { firebaseApp };
