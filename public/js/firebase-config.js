// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAfHvAMvxUIibCn0AkAxZXHPf6Tjf2T1Qg",
    authDomain: "learning-manage-system-7c0e7.firebaseapp.com",
    projectId: "learning-manage-system-7c0e7",
    storageBucket: "learning-manage-system-7c0e7.firebasestorage.app",
    messagingSenderId: "1058933536580",
    appId: "1:1058933536580:web:079f52b52c9034a1864911",
    measurementId: "G-4477HEH789"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, collection, addDoc, getDocs, query, where, doc, getDoc, setDoc, updateDoc };
