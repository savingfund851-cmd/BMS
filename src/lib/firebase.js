import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA5qXfSFsjFPAvsEniCGWzD5eKF97wiXOo",
  authDomain: "tenant-de0b1.firebaseapp.com",
  projectId: "tenant-de0b1",
  storageBucket: "tenant-de0b1.firebasestorage.app",
  messagingSenderId: "1071878649434",
  appId: "1:1071878649434:web:32362e4e952f63927bca63",
  measurementId: "G-XKZVR5KCM4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
