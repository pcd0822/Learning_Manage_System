import { auth, provider, signInWithPopup, signOut, onAuthStateChanged } from './firebase-config.js';

export function loginWithGoogle() {
    return signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user;
            console.log("User logged in:", user);
            return user;
        })
        .catch((error) => {
            console.error("Login failed:", error);
            throw error;
        });
}

export function logout() {
    return signOut(auth)
        .then(() => {
            console.log("User logged out");
        })
        .catch((error) => {
            console.error("Logout failed:", error);
        });
}

export function checkAuthState(callback) {
    onAuthStateChanged(auth, (user) => {
        callback(user);
    });
}
