// Firebase Configuration
// Replace these values with your own Firebase project credentials

const firebaseConfig = {
    apiKey: "AIzaSyBeFOSaXNMfq9bWkRCy2gnpBrulFiLqcDc",
    authDomain: "badaam-saat-game.firebaseapp.com",
    databaseURL: "https://badaam-saat-game-default-rtdb.firebaseio.com",
    projectId: "badaam-saat-game",
    storageBucket: "badaam-saat-game.firebasestorage.app",
    messagingSenderId: "1012781339206",
    appId: "1:1012781339206:web:cb04b696f4b82e48b53047"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get references to Firebase services
const auth = firebase.auth();
const database = firebase.database();

// Global variables
let currentUser = null;
let currentRoom = null;
let gameInstance = null;
let isHost = false;

// Authentication state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        console.log('User logged in:', user.uid);
        onUserLoggedIn();
    } else {
        currentUser = null;
        console.log('User logged out');
        onUserLoggedOut();
    }
});

// Handle user logged in
function onUserLoggedIn() {
    if (typeof hideAllSections === 'function') {
        hideAllSections();
    }
    const lobbySection = document.getElementById('lobbySection');
    if (lobbySection) {
        lobbySection.classList.remove('hidden');
        updateUserInfo();
        if (typeof loadActiveRooms === 'function') {
            loadActiveRooms();
        }
    }
}

// Handle user logged out
function onUserLoggedOut() {
    if (typeof hideAllSections === 'function') {
        hideAllSections();
    }
    const authSection = document.getElementById('authSection');
    if (authSection) {
        authSection.classList.remove('hidden');
    }
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.innerHTML = '';
    }
}

// Update user info display
function updateUserInfo() {
    const userInfo = document.getElementById('userInfo');
    if (currentUser) {
        const displayName = currentUser.email || currentUser.displayName || 'Guest User';
        const isAnonymous = currentUser.isAnonymous;
        
        userInfo.innerHTML = `
            <span>${isAnonymous ? '👤' : '📧'} ${displayName}</span>
            <button onclick="logout()" class="btn-ghost" style="padding: 0.5rem 1rem;">Logout</button>
        `;
    }
}

// Logout function
async function logout() {
    try {
        showLoading(true);
        
        // Leave room if in one
        if (currentRoom) {
            await leaveRoom();
        }
        
        await auth.signOut();
        showSuccess('Logged out successfully');
    } catch (error) {
        console.error('Logout error:', error);
        showError('Failed to logout');
    } finally {
        showLoading(false);
    }
}

// Check browser support on load
window.addEventListener('load', () => {
    if (typeof checkBrowserSupport === 'function' && !checkBrowserSupport()) {
        if (typeof showError === 'function') {
            showError('Your browser may not support all features of this game');
        }
    }
});

// Handle connection state
const connectedRef = database.ref('.info/connected');
connectedRef.on('value', (snapshot) => {
    if (snapshot.val() === true) {
        console.log('Connected to Firebase');
    } else {
        console.log('Disconnected from Firebase');
        if (typeof showWarning === 'function') {
            showWarning('Connection lost. Reconnecting...');
        }
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (currentRoom && currentUser) {
        // Mark user as disconnected
        database.ref(`rooms/${currentRoom}/players/${currentUser.uid}/connected`).set(false);
    }
});

