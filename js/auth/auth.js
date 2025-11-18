// Authentication Functions

// Login with email and password
async function login() {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    
    if (!email || !password) {
        showError('Please enter email and password');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }
    
    try {
        showLoading(true);
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        
        // Update user profile
        await updateUserProfile(currentUser);
        showSuccess('Logged in successfully!');
    } catch (error) {
        handleAuthError(error);
    } finally {
        showLoading(false);
    }
}

// Register new user
async function register() {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    
    if (!email || !password) {
        showError('Please enter email and password');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }
    
    try {
        showLoading(true);
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        
        // Create user profile in database
        await createUserProfile(currentUser);
        showSuccess('Account created successfully!');
    } catch (error) {
        handleAuthError(error);
    } finally {
        showLoading(false);
    }
}

// Play as guest (anonymous auth)
async function playAsGuest() {
    try {
        showLoading(true);
        const userCredential = await auth.signInAnonymously();
        currentUser = userCredential.user;
        
        // Create temporary profile
        await createGuestProfile(currentUser);
        showSuccess('Playing as guest!');
    } catch (error) {
        handleAuthError(error);
    } finally {
        showLoading(false);
    }
}

// Password reset
async function resetPassword() {
    const email = document.getElementById('resetEmail').value.trim();
    
    if (!email) {
        showError('Please enter your email');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }
    
    try {
        showLoading(true);
        await auth.sendPasswordResetEmail(email);
        showSuccess('Password reset email sent! Check your inbox.');
        showLogin();
    } catch (error) {
        handleAuthError(error);
    } finally {
        showLoading(false);
    }
}

// Create user profile in database
async function createUserProfile(user) {
    // Always generate a proper username (never 'Player')
    let username = user.email ? user.email.split('@')[0] : `User_${generateRoomCode(6)}`;
    
    const profile = {
        email: user.email || null,
        username: username,
        isAnonymous: false,
        stats: {
            gamesPlayed: 0,
            gamesWon: 0,
            totalPoints: 0,
            averagePoints: 0,
            winRate: 0,
            currentStreak: 0,
            longestStreak: 0
        },
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    };
    
    await database.ref(`users/${user.uid}`).set(profile);
    return profile;
}

// Create guest profile
async function createGuestProfile(user) {
    const username = `Guest_${generateRoomCode(4)}`;
    
    const profile = {
        email: null,
        username: username,
        isAnonymous: true,
        stats: {
            gamesPlayed: 0,
            gamesWon: 0,
            totalPoints: 0,
            averagePoints: 0,
            winRate: 0,
            currentStreak: 0,
            longestStreak: 0
        },
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    };
    
    await database.ref(`users/${user.uid}`).set(profile);
    return profile;
}

// Update user profile (update last seen)
async function updateUserProfile(user) {
    if (!user) return;
    
    // Check if profile exists
    const snapshot = await database.ref(`users/${user.uid}`).once('value');
    
    if (!snapshot.exists()) {
        // Create profile if it doesn't exist
        if (user.isAnonymous) {
            await createGuestProfile(user);
        } else {
            await createUserProfile(user);
        }
    } else {
        // Update last seen
        await database.ref(`users/${user.uid}/lastSeen`).set(firebase.database.ServerValue.TIMESTAMP);
    }
}

// Get user username - ensures username exists
async function getUserUsername(userId = null) {
    const uid = userId || currentUser?.uid;
    if (!uid) {
        console.error('getUserUsername: No UID provided');
        return null;
    }
    
    try {
        const snapshot = await database.ref(`users/${uid}/username`).once('value');
        let username = snapshot.val();
        
        // If username doesn't exist or is 'Player', create one
        if (!username || username === 'Player' || username.trim() === '') {
            console.log(`Username missing for ${uid}, creating one...`);
            username = `User_${generateRoomCode(6)}`;
            
            // Update user profile with new username
            await database.ref(`users/${uid}/username`).set(username);
            console.log(`Created username: ${username} for ${uid}`);
        }
        
        return username;
    } catch (error) {
        console.error('Error getting username:', error);
        // Don't return 'Player', return null and let caller handle it
        return null;
    }
}

// Handle authentication errors
function handleAuthError(error) {
    console.error('Auth error:', error);
    
    let message = 'Authentication failed';
    
    switch (error.code) {
        case 'auth/invalid-email':
            message = 'Invalid email address';
            break;
        case 'auth/user-disabled':
            message = 'This account has been disabled';
            break;
        case 'auth/user-not-found':
            message = 'No account found with this email';
            break;
        case 'auth/wrong-password':
            message = 'Incorrect password';
            break;
        case 'auth/email-already-in-use':
            message = 'Email already in use';
            break;
        case 'auth/weak-password':
            message = 'Password is too weak';
            break;
        case 'auth/too-many-requests':
            message = 'Too many attempts. Try again later';
            break;
        case 'auth/network-request-failed':
            message = 'Network error. Check your connection';
            break;
        default:
            message = error.message || 'Authentication failed';
    }
    
    showError(message);
}

// Show login form
function showLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('resetForm').classList.add('hidden');
}

// Show reset form
function showResetForm() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('resetForm').classList.remove('hidden');
}

// Handle Enter key in inputs
document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const resetEmail = document.getElementById('resetEmail');
    
    if (emailInput) {
        emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                passwordInput.focus();
            }
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                login();
            }
        });
    }
    
    if (resetEmail) {
        resetEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                resetPassword();
            }
        });
    }
    
    // Room code input uppercase
    const roomCodeInput = document.getElementById('roomCode');
    if (roomCodeInput) {
        roomCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
        
        roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                joinRoom();
            }
        });
    }
});

