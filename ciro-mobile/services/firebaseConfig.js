import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: "dauntless-gate-496516-n9",
  appId: "1:388366922818:web:83f7ac6eeb1950dc7429db",
  storageBucket: "dauntless-gate-496516-n9.firebasestorage.app",
  apiKey: "AIzaSyAAky0gmCE3aBhKZrzI1KcTLiKtjUTmwcc",
  authDomain: "dauntless-gate-496516-n9.firebaseapp.com",
  messagingSenderId: "388366922818"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export default app;
