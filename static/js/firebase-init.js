// ==========================================================================
// TubeLoad - Firebase SDK, Authentication (Google Sign-In) & Firestore DB
// Project: tubeload-security
// App ID: 1:340557488258:web:4733a504c56ed89421d49b
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

// Your registered web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyDOF3eQaIKJd-gOPkTBSeaGYu0_r2wXyMU",
  authDomain: "tubeload-security.firebaseapp.com",
  projectId: "tubeload-security",
  storageBucket: "tubeload-security.firebasestorage.app",
  messagingSenderId: "340557488258",
  appId: "1:340557488258:web:4733a504c56ed89421d49b",
  measurementId: "G-NNNQVVJ013"
};

// 1. Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// 2. Initialize Firebase Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// 3. Initialize Cloud Firestore Database
export const db = getFirestore(app);

// 4. Initialize Analytics (with safe fallback for ad-blockers/environments)
export let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(() => {
  // Silent catch for analytics
});

// ==========================================================================
// Authentication Operations
// ==========================================================================

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Save or update user profile in Firestore
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName || "Anonymous",
        email: user.email || "",
        photoURL: user.photoURL || "",
        lastLogin: serverTimestamp()
      }, { merge: true });
    } catch (dbErr) {
      console.warn("Could not sync user profile to Firestore (check rules):", dbErr);
    }

    return user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    if (error.code === 'auth/popup-closed-by-user') {
      return null;
    }
    if (error.code === 'auth/unauthorized-domain') {
      alert("Notice: For Google Sign-in to work on your domain or localhost, ensure '" + window.location.hostname + "' is added to Authorized Domains in Firebase Console (Authentication > Settings > Authorized domains).");
    }
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function logOut() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-out Error:", error);
    throw error;
  }
}

// ==========================================================================
// Firestore Database Operations (Download History)
// ==========================================================================

/**
 * Save downloaded video item to user's download history in Firestore
 */
export async function saveDownloadToHistory(downloadData) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return null;
  }

  try {
    const historyCol = collection(db, "users", currentUser.uid, "downloads");
    const docRef = await addDoc(historyCol, {
      title: downloadData.title || "YouTube Video",
      url: downloadData.url || "",
      format: downloadData.format || "mp4",
      quality: downloadData.quality || "720p",
      thumbnail: downloadData.thumbnail || "",
      duration: downloadData.duration || "00:00",
      channel: downloadData.channel || "",
      downloadedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.warn("Could not save download to Firestore history:", error);
    return null;
  }
}

/**
 * Fetch user's download history from Firestore
 */
export async function fetchUserDownloadHistory() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return [];
  }

  try {
    const historyCol = collection(db, "users", currentUser.uid, "downloads");
    const q = query(historyCol, orderBy("downloadedAt", "desc"), limit(25));
    const snapshot = await getDocs(q);

    const items = [];
    snapshot.forEach((docSnap) => {
      items.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    return items;
  } catch (error) {
    console.warn("Could not fetch download history from Firestore:", error);
    return [];
  }
}

/**
 * Delete a single download item from history
 */
export async function deleteHistoryItem(downloadId) {
  const currentUser = auth.currentUser;
  if (!currentUser || !downloadId) {
    return false;
  }

  try {
    const itemRef = doc(db, "users", currentUser.uid, "downloads", downloadId);
    await deleteDoc(itemRef);
    return true;
  } catch (error) {
    console.warn("Could not delete download history item:", error);
    return false;
  }
}

// Expose on window object for easy integration across scripts
window.TubeLoadFirebase = {
  app,
  auth,
  db,
  signInWithGoogle,
  logOut,
  saveDownloadToHistory,
  fetchUserDownloadHistory,
  deleteHistoryItem,
  onAuthStateChanged: (callback) => onAuthStateChanged(auth, callback)
};

console.log("TubeLoad Firebase initialized (Auth & Firestore ready)");
