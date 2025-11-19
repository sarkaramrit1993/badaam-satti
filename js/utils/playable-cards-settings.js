// Playable Cards Settings Module
// Centralized management of playable cards highlighting setting

let playableCardsSetting = true; // Default

// Get the Firebase path for playable cards setting
function getPlayableCardsSettingPath(roomCode) {
    return `rooms/${roomCode}/metadata/settings/showPlayableCards`;
}

// Load playable cards setting from room
async function loadPlayableCardsSetting(roomCode) {
    if (!roomCode) return true; // Default if no room
    
    try {
        const snapshot = await database.ref(getPlayableCardsSettingPath(roomCode)).once('value');
        const roomSetting = snapshot.val();
        return roomSetting !== false; // Default to true if not set
    } catch (error) {
        console.error('Error loading playable cards setting:', error);
        return true; // Default to enabled on error
    }
}

// Update playable cards setting in room
async function updatePlayableCardsSetting(roomCode, value) {
    if (!roomCode) return;
    
    try {
        await database.ref(getPlayableCardsSettingPath(roomCode)).set(value);
        return true;
    } catch (error) {
        console.error('Error updating playable cards setting:', error);
        throw error;
    }
}

// Setup real-time listener for playable cards setting changes
function setupPlayableCardsListener(roomCode, callback) {
    if (!roomCode) return null;
    
    return database.ref(getPlayableCardsSettingPath(roomCode)).on('value', (snapshot) => {
        const newValue = snapshot.val() !== false;
        playableCardsSetting = newValue;
        if (callback) callback(newValue);
    });
}

// Get current playable cards setting
function getPlayableCardsSetting() {
    return playableCardsSetting;
}

// Set playable cards setting (local state)
function setPlayableCardsSetting(value) {
    playableCardsSetting = value;
}

// Update UI elements for playable cards setting
function updatePlayableCardsUI(value) {
    // Update toggle button in game header
    const toggle = document.getElementById('playableCardsToggle');
    if (toggle) {
        toggle.style.opacity = value ? '1' : '0.5';
        toggle.title = value ? 'Hide Playable Cards (Host)' : 'Show Playable Cards (Host)';
    }
    
    // Update checkbox in room settings
    const checkbox = document.getElementById('showPlayableCardsSetting');
    if (checkbox) {
        checkbox.checked = value;
    }
}

// Initialize playable cards setting for game UI
async function initPlayableCardsForGame(roomCode, onSettingChange) {
    if (!roomCode) return;
    
    // Load initial setting
    const initialValue = await loadPlayableCardsSetting(roomCode);
    setPlayableCardsSetting(initialValue);
    
    // Setup real-time listener
    setupPlayableCardsListener(roomCode, (newValue) => {
        setPlayableCardsSetting(newValue);
        updatePlayableCardsUI(newValue);
        if (onSettingChange) onSettingChange(newValue);
    });
    
    return initialValue;
}

// Initialize playable cards setting for room settings UI
async function initPlayableCardsForRoom(roomCode, isHost) {
    if (!roomCode) return;
    
    const checkbox = document.getElementById('showPlayableCardsSetting');
    const settingGroup = document.getElementById('playableCardsSettingGroup');
    
    if (!checkbox || !settingGroup) return;
    
    // Load initial setting
    const initialValue = await loadPlayableCardsSetting(roomCode);
    checkbox.checked = initialValue;
    settingGroup.style.display = 'block';
    
    if (isHost) {
        // Host can control
        checkbox.disabled = false;
        
        // Handle host changes
        checkbox.addEventListener('change', async (e) => {
            const newValue = e.target.checked;
            try {
                await updatePlayableCardsSetting(roomCode, newValue);
                showToast(
                    newValue 
                        ? 'Playable cards highlighting enabled for all players' 
                        : 'Playable cards highlighting disabled for all players', 
                    'info'
                );
            } catch (error) {
                showError('Failed to update setting');
                checkbox.checked = !newValue; // Revert on error
            }
        });
    } else {
        // Non-host: read-only
        checkbox.disabled = true;
        
        // Listen for host changes
        setupPlayableCardsListener(roomCode, (newValue) => {
            checkbox.checked = newValue;
        });
    }
}

