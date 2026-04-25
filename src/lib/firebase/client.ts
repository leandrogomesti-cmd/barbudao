
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCbY6JoMx5toqPzAaMhgWeta3hJU2CNE7o",
  authDomain: "ronaldo-amanae.firebaseapp.com",
  projectId: "ronaldo-amanae",
  storageBucket: "ronaldo-amanae.firebasestorage.app",
  messagingSenderId: "843884922346",
  appId: "1:843884922346:web:45984b55306a117c099e93",
  measurementId: "G-H9HK3SQ4ZQ"
};

// Initialize Firebase securely
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}


const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);


export { app, auth, db };
