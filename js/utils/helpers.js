// Helper Functions

// Generate random room code
function generateRoomCode(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

// Shuffle array (Fisher-Yates algorithm)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Create deck of cards
function createDeck() {
    const deck = [];
    for (const suit of Object.values(SUITS)) {
        for (const rank of RANKS) {
            deck.push(rank + suit);
        }
    }
    return deck;
}

// Sort cards by suit and rank
function sortCards(cards) {
    return cards.sort((a, b) => {
        const suitA = a.slice(-1);
        const suitB = b.slice(-1);
        const rankA = a.slice(0, -1);
        const rankB = b.slice(0, -1);
        
        // First sort by suit
        if (SUIT_ORDER[suitA] !== SUIT_ORDER[suitB]) {
            return SUIT_ORDER[suitA] - SUIT_ORDER[suitB];
        }
        
        // Then sort by rank within suit
        return RANK_INDICES[rankA] - RANK_INDICES[rankB];
    });
}

// Calculate points for a hand of cards
function calculatePoints(cards) {
    return cards.reduce((sum, card) => {
        const rank = card.slice(0, -1);
        return sum + RANK_VALUES[rank];
    }, 0);
}

// Parse card string to get rank and suit
function parseCard(cardStr) {
    const suit = cardStr.slice(-1);
    const rank = cardStr.slice(0, -1);
    return { rank, suit };
}

// Get card display HTML - simplified: just rank and suit symbol
function getCardHTML(cardStr) {
    const { rank, suit } = parseCard(cardStr);
    const color = SUIT_COLORS[suit];
    const symbol = SUIT_SYMBOLS[suit];
    
    return `
        <div class="card ${color}" data-card="${cardStr}">
            <div class="card-rank">${rank}</div>
            <div class="card-suit">${symbol}</div>
        </div>
    `;
}

// Show/hide sections
function hideAllSections() {
    const authSection = document.getElementById('authSection');
    const lobbySection = document.getElementById('lobbySection');
    const waitingRoom = document.getElementById('waitingRoom');
    
    if (authSection) authSection.classList.add('hidden');
    if (lobbySection) lobbySection.classList.add('hidden');
    if (waitingRoom) waitingRoom.classList.add('hidden');
}

// Show loading spinner
function showLoading(show = true) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.remove('hidden');
    } else {
        spinner.classList.add('hidden');
    }
}

// Toast notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showError(message) {
    showToast(message, 'error');
}

function showWarning(message) {
    showToast(message, 'warning');
}

// Format timestamp
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

// Validate email
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showSuccess('Copied to clipboard!');
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        showError('Failed to copy to clipboard');
        return false;
    }
}

// Get current date string for leaderboard
function getCurrentDateString() {
    return new Date().toISOString().split('T')[0];
}

// Get current week string for leaderboard
function getCurrentWeekString() {
    const date = new Date();
    const year = date.getFullYear();
    const week = Math.ceil(((date - new Date(year, 0, 1)) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7);
    return `${year}-W${week.toString().padStart(2, '0')}`;
}

// Get position medal
function getPositionMedal(position) {
    const medals = {
        1: '🥇',
        2: '🥈',
        3: '🥉'
    };
    return medals[position] || '';
}

// Format score display
function formatScore(score) {
    return score === 0 ? 'Winner!' : `${score} pts`;
}

// Check if browser supports required features
function checkBrowserSupport() {
    const features = {
        localStorage: typeof Storage !== 'undefined',
        clipboard: navigator.clipboard !== undefined,
        firebase: typeof firebase !== 'undefined'
    };
    
    const unsupported = Object.entries(features)
        .filter(([key, value]) => !value)
        .map(([key]) => key);
    
    if (unsupported.length > 0) {
        console.warn('Unsupported features:', unsupported);
    }
    
    return unsupported.length === 0;
}

// Animate element
function animateElement(element, animationClass, duration = 1000) {
    element.classList.add(animationClass);
    setTimeout(() => {
        element.classList.remove(animationClass);
    }, duration);
}

// Create empty board structure
function createEmptyBoard() {
    return {
        hearts: { seven: false, sequence: [], up: [], down: [] },
        spades: { seven: false, sequence: [], up: [], down: [] },
        diamonds: { seven: false, sequence: [], up: [], down: [] },
        clubs: { seven: false, sequence: [], up: [], down: [] }
    };
}

