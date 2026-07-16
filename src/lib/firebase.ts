import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDQ4RSUSRnzdtvvRFNeAvWr-tF0LAbiZj8",
  authDomain: "docmind-ai-15d06.firebaseapp.com",
  projectId: "docmind-ai-15d06",
  storageBucket: "docmind-ai-15d06.firebasestorage.app",
  messagingSenderId: "84432277382",
  appId: "1:84432277382:web:c9c5b1343442ec732e2607"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
