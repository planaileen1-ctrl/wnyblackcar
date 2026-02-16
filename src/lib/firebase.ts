import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Firestore, getFirestore } from "firebase/firestore";
import { firebaseConfig, firebaseConfigError } from "@/lib/firebase-config";

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

if (!firebaseConfigError) {
  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  firestoreDb = getFirestore(firebaseApp);
}

export { firebaseApp, firestoreDb, firebaseConfigError };
