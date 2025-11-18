// Activity Feed - Track and display recent game moves

let activityLog = [];
const MAX_ACTIVITIES = 10;

// Initialize activity feed listeners
function initActivityFeed() {
    // Listen to activity history in Firebase
    database.ref(`rooms/${roomCode}/activityHistory`)
        .limitToLast(MAX_ACTIVITIES)
        .on('child_added', (snapshot) => {
            const action = snapshot.val();
            if (action && !activityLog.find(a => a.id === snapshot.key)) {
                action.id = snapshot.key;
                activityLog.unshift(action);
                
                // Keep only last 10
                if (activityLog.length > MAX_ACTIVITIES) {
                    activityLog.pop();
                }
                
                renderActivityFeed();
            }
        });
    
    // Initial load
    loadActivityHistory();
}

// Load initial activity history
async function loadActivityHistory() {
    try {
        const snapshot = await database.ref(`rooms/${roomCode}/activityHistory`)
            .limitToLast(MAX_ACTIVITIES)
            .once('value');
        
        if (snapshot.exists()) {
            const activities = [];
            snapshot.forEach((child) => {
                const action = child.val();
                action.id = child.key;
                activities.unshift(action);
            });
            activityLog = activities;
            renderActivityFeed();
        }
    } catch (error) {
        console.error('Error loading activity history:', error);
    }
}

// Add an activity to the feed
function addActivity(action) {
    const activity = {
        ...action,
        timestamp: action.timestamp || Date.now(),
        id: `activity-${Date.now()}-${Math.random()}`
    };
    
    // Add to beginning of array
    activityLog.unshift(activity);
    
    // Keep only last 10
    if (activityLog.length > MAX_ACTIVITIES) {
        activityLog = activityLog.slice(0, MAX_ACTIVITIES);
    }
    
    // Render activity feed
    renderActivityFeed();
}

// Render the activity feed
async function renderActivityFeed() {
    const activityList = document.getElementById('activityList');
    
    if (!activityList) {
        return;
    }
    
    if (activityLog.length === 0) {
        activityList.innerHTML = '<p class="no-activity">No moves yet...</p>';
        return;
    }
    
    // Clear list
    activityList.innerHTML = '';
    
    // Render each activity
    for (const activity of activityLog) {
        const item = await createActivityItem(activity);
        activityList.appendChild(item);
    }
}

// Create an activity item element
async function createActivityItem(activity) {
    const item = document.createElement('div');
    item.className = `activity-item ${activity.type}-action`;
    item.dataset.id = activity.id;
    
    // Get player name
    const username = await getUserUsername(activity.player);
    
    // Format action text
    let actionText = '';
    if (activity.type === 'play') {
        const { rank, suit } = parseCard(activity.card);
        const symbol = SUIT_SYMBOLS[suit];
        const color = SUIT_COLORS[suit];
        // Add hover effect for cards played by other players
        if (activity.player !== currentUser.uid) {
            actionText = `played <span class="activity-card ${color}" data-card="${activity.card}" title="Hover to see on board">${rank}${symbol}</span>`;
        } else {
            actionText = `played <strong>${rank}${symbol}</strong>`;
        }
    } else if (activity.type === 'pass') {
        actionText = 'passed their turn';
    } else {
        actionText = activity.type;
    }
    
    // Format time
    const timeAgo = getTimeAgo(activity.timestamp);
    
    item.innerHTML = `
        <div class="activity-player">${username}${activity.player === currentUser.uid ? ' (You)' : ''}</div>
        <div class="activity-action">${actionText}</div>
        <div class="activity-time">${timeAgo}</div>
    `;
    
    // Add hover effect for cards played by others
    if (activity.type === 'play' && activity.player !== currentUser.uid) {
        const cardElement = item.querySelector('.activity-card');
        if (cardElement) {
            cardElement.addEventListener('mouseenter', () => {
                highlightCardOnBoard(activity.card);
            });
            cardElement.addEventListener('mouseleave', () => {
                clearCardHighlight();
            });
        }
    }
    
    return item;
}

// Get time ago string
function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 10) {
        return 'Just now';
    } else if (seconds < 60) {
        return `${seconds}s ago`;
    } else if (minutes < 60) {
        return `${minutes}m ago`;
    } else {
        return `${hours}h ago`;
    }
}

// Toggle activity feed visibility
function toggleActivityFeed() {
    const feed = document.getElementById('activityFeed');
    if (feed) {
        feed.classList.toggle('hidden');
        
        // Update button appearance
        const toggle = document.getElementById('activityToggle');
        if (toggle) {
            if (feed.classList.contains('hidden')) {
                toggle.textContent = '📜';
                toggle.title = 'Show Activity Feed';
            } else {
                toggle.textContent = '✕';
                toggle.title = 'Hide Activity Feed';
                // Render when opening
                renderActivityFeed();
            }
        }
    }
}

// Clear activity feed (for new games)
function clearActivityFeed() {
    activityLog = [];
    renderActivityFeed();
}

// Highlight a card on the board when hovering in activity feed
function highlightCardOnBoard(cardStr) {
    // Find the card on the board by data attribute
    const cards = document.querySelectorAll('.card[data-card]');
    cards.forEach(card => {
        if (card.dataset.card === cardStr) {
            card.classList.add('hover-highlight');
        }
    });
}

// Clear card highlight
function clearCardHighlight() {
    const highlightedCards = document.querySelectorAll('.card.hover-highlight');
    highlightedCards.forEach(card => {
        card.classList.remove('hover-highlight');
    });
}

