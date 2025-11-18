// Room Management System

// Show/hide create room modal
function showCreateRoomModal() {
    document.getElementById('createRoomModal').classList.remove('hidden');
    
    // Add event listener for room type change
    const roomTypeRadios = document.querySelectorAll('input[name="roomType"]');
    roomTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const sessionOptions = document.getElementById('sessionOptions');
            if (e.target.value === 'session') {
                sessionOptions.style.display = 'block';
            } else {
                sessionOptions.style.display = 'none';
            }
        });
    });
}

function closeCreateRoomModal() {
    document.getElementById('createRoomModal').classList.add('hidden');
}

// Create new room
async function createRoom() {
    if (!currentUser) {
        showError('Please login first');
        return;
    }
    
    const roomName = document.getElementById('roomNameInput').value.trim();
    const roomType = document.querySelector('input[name="roomType"]:checked').value;
    
    if (!roomName) {
        showError('Please enter a room name');
        return;
    }
    
    try {
        showLoading(true);
        
        // Generate unique room code
        let roomCode;
        let attempts = 0;
        do {
            roomCode = generateRoomCode();
            const snapshot = await database.ref(`rooms/${roomCode}`).once('value');
            if (!snapshot.exists()) break;
            attempts++;
        } while (attempts < 10);
        
        if (attempts >= 10) {
            throw new Error('Failed to generate unique room code');
        }
        
        const username = await getUserUsername();
        
        // Room settings
        const settings = {
            targetScore: roomType === 'session' ? (parseInt(document.getElementById('targetScore').value) || null) : null,
            maxGames: roomType === 'session' ? (parseInt(document.getElementById('maxGames').value) || null) : null,
            allowLateJoin: roomType === 'session' ? document.getElementById('allowLateJoin').checked : false
        };
        
        const isPublic = roomType === 'session' ? document.getElementById('isPublic').checked : false;
        
        // Create room data
        const roomData = {
            metadata: {
                roomName,
                type: roomType,
                host: currentUser.uid,
                created: firebase.database.ServerValue.TIMESTAMP,
                isPublic,
                settings
            },
            members: {
                [currentUser.uid]: {
                    username,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP,
                    isActive: true,
                    isHost: true,
                    sessionStats: {
                        gamesPlayed: 0,
                        gamesWon: 0,
                        totalPoints: 0,
                        averagePoints: 0
                    }
                }
            },
            players: {},
            gameState: {
                started: false,
                currentTurn: null,
                finished: false
            },
            board: createEmptyBoard(),
            hands: {},
            gameHistory: {},
            sessionLeaderboard: {}
        };
        
        // Save room
        await database.ref(`rooms/${roomCode}`).set(roomData);
        
        // Add to user's active rooms
        await database.ref(`userRooms/${currentUser.uid}/activeRooms/${roomCode}`).set({
            roomName,
            lastPlayed: firebase.database.ServerValue.TIMESTAMP
        });
        
        // If public, add to public rooms
        if (isPublic) {
            await database.ref(`publicRooms/${roomCode}`).set({
                roomName,
                type: roomType,
                currentPlayers: 1,
                maxPlayers: 4,
                created: firebase.database.ServerValue.TIMESTAMP
            });
        }
        
        currentRoom = roomCode;
        isHost = true;
        
        closeCreateRoomModal();
        enterWaitingRoom(roomCode);
        showSuccess(`Room created! Code: ${roomCode}`);
        
    } catch (error) {
        console.error('Error creating room:', error);
        showError('Failed to create room');
    } finally {
        showLoading(false);
    }
}

// Join room by code
async function joinRoom() {
    const roomCode = document.getElementById('roomCode').value.trim().toUpperCase();
    
    if (!roomCode) {
        showError('Please enter a room code');
        return;
    }
    
    if (roomCode.length !== 6) {
        showError('Room code must be 6 characters');
        return;
    }
    
    try {
        showLoading(true);
        
        // Check if room exists
        const snapshot = await database.ref(`rooms/${roomCode}`).once('value');
        if (!snapshot.exists()) {
            showError('Room not found');
            return;
        }
        
        const roomData = snapshot.val();
        const members = roomData.members || {};
        const activeMemberCount = Object.values(members).filter(m => m.isActive).length;
        
        // Check if room is full
        if (activeMemberCount >= 4) {
            showError('Room is full');
            return;
        }
        
        // Check if already a member
        if (members[currentUser.uid]) {
            // Rejoin as existing member
            await database.ref(`rooms/${roomCode}/members/${currentUser.uid}/isActive`).set(true);
            await database.ref(`rooms/${roomCode}/members/${currentUser.uid}/rejoinedAt`).set(firebase.database.ServerValue.TIMESTAMP);
        } else {
            // Add as new member - ensure username exists
            let username = await getUserUsername();
            if (!username) {
                // If getUserUsername returns null, create a proper username
                username = `User_${generateRoomCode(6)}`;
                await database.ref(`users/${currentUser.uid}/username`).set(username);
            }
            
            const memberData = {
                username,
                joinedAt: firebase.database.ServerValue.TIMESTAMP,
                isActive: true,
                isHost: false,
                sessionStats: {
                    gamesPlayed: 0,
                    gamesWon: 0,
                    totalPoints: 0,
                    averagePoints: 0
                }
            };
            
            await database.ref(`rooms/${roomCode}/members/${currentUser.uid}`).set(memberData);
        }
        
        // Add to user's active rooms
        await database.ref(`userRooms/${currentUser.uid}/activeRooms/${roomCode}`).set({
            roomName: roomData.metadata.roomName,
            lastPlayed: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Update public room count if applicable
        if (roomData.metadata.isPublic) {
            await database.ref(`publicRooms/${roomCode}/currentPlayers`).set(activeMemberCount + 1);
        }
        
        currentRoom = roomCode;
        enterWaitingRoom(roomCode);
        showSuccess('Joined room successfully!');
        
    } catch (error) {
        console.error('Error joining room:', error);
        showError('Failed to join room');
    } finally {
        showLoading(false);
    }
}

// Enter waiting room
function enterWaitingRoom(roomCode) {
    hideAllSections();
    document.getElementById('waitingRoom').classList.remove('hidden');
    document.getElementById('currentRoomCode').textContent = roomCode;
    
    // Load room data and setup listeners
    loadRoomData(roomCode);
    setupRoomListeners(roomCode);
    checkIfHost(roomCode);
}

// Load room data
async function loadRoomData(roomCode) {
    try {
        const snapshot = await database.ref(`rooms/${roomCode}`).once('value');
        const roomData = snapshot.val();
        
        if (!roomData) {
            showError('Room not found');
            showLobby();
            return;
        }
        
        // Update room header
        document.getElementById('roomName').textContent = roomData.metadata.roomName;
        const typeBadge = document.getElementById('roomTypeBadge');
        typeBadge.textContent = roomData.metadata.type === 'session' ? 'Session Room' : 'Single Game';
        
        // Show session-specific elements
        if (roomData.metadata.type === 'session') {
            document.getElementById('sessionStats').classList.remove('hidden');
            document.getElementById('sessionLeaderboard').classList.remove('hidden');
            const historyBtn = document.getElementById('gameHistoryBtn');
            if (historyBtn) historyBtn.classList.remove('hidden');
            
            // Update session stats
            const gamesPlayed = Object.keys(roomData.gameHistory || {}).length;
            document.getElementById('gamesPlayed').textContent = gamesPlayed;
            document.getElementById('displayTargetScore').textContent = 
                roomData.metadata.settings.targetScore || 'None';
            
            // Update session leaderboard
            if (roomData.sessionLeaderboard) {
                updateSessionLeaderboard(roomData.sessionLeaderboard);
            }
        } else {
            document.getElementById('sessionStats').classList.add('hidden');
            document.getElementById('sessionLeaderboard').classList.add('hidden');
            const historyBtn = document.getElementById('gameHistoryBtn');
            if (historyBtn) historyBtn.classList.add('hidden');
        }
        
    } catch (error) {
        console.error('Error loading room data:', error);
        showError('Failed to load room data');
    }
}

// Update session leaderboard display
async function updateSessionLeaderboard(leaderboard) {
    const standingsList = document.getElementById('standingsList');
    
    if (!leaderboard || Object.keys(leaderboard).length === 0) {
        standingsList.innerHTML = '<div class="no-data">No games played yet</div>';
        document.getElementById('sessionLeader').textContent = '-';
        return;
    }
    
    // Convert to array and sort by points (ascending - lower is better)
    const standings = Object.entries(leaderboard)
        .map(([uid, stats]) => ({
            uid,
            ...stats
        }))
        .sort((a, b) => a.totalPoints - b.totalPoints);
    
    standingsList.innerHTML = '<div class="loading">Loading usernames...</div>';
    
    // Fetch usernames - ensure they exist
    const standingsWithUsernames = await Promise.all(standings.map(async (player) => {
        // Use getUserUsername which ensures username exists
        let username = await getUserUsername(player.uid);
        
        // If still null, something went wrong - log it
        if (!username) {
            console.error(`Failed to get username for ${player.uid}`);
            username = `User_${player.uid.slice(0, 6)}`;
        }
        
        return { ...player, username };
    }));
    
    standingsList.innerHTML = '';
    standingsWithUsernames.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = `standings-item ${player.uid === currentUser.uid ? 'highlight' : ''}`;
        
        const medal = getPositionMedal(index + 1);
        
        item.innerHTML = `
            <span>${medal} ${player.username}</span>
            <span>${player.gamesWon}</span>
            <span>${player.totalPoints}</span>
            <span>${player.averagePoints.toFixed(1)}</span>
        `;
        
        standingsList.appendChild(item);
    });
    
    // Update session leader
    if (standingsWithUsernames.length > 0) {
        document.getElementById('sessionLeader').textContent = 
            `${standingsWithUsernames[0].username} (${standingsWithUsernames[0].totalPoints} pts)`;
    }
}

// Setup real-time listeners
function setupRoomListeners(roomCode) {
    // Listen for members changes
    database.ref(`rooms/${roomCode}/members`).on('value', (snapshot) => {
        const members = snapshot.val() || {};
        updateMembersList(members);
    });
    
    // Listen for game state changes
    database.ref(`rooms/${roomCode}/gameState/started`).on('value', (snapshot) => {
        if (snapshot.val() === true) {
            // Redirect to game page
            window.location.href = `game.html?room=${roomCode}`;
        }
    });
    
    // Listen for session leaderboard updates
    database.ref(`rooms/${roomCode}/sessionLeaderboard`).on('value', (snapshot) => {
        const leaderboard = snapshot.val();
        if (leaderboard) {
            updateSessionLeaderboard(leaderboard);
        }
    });
    
    // Set up disconnect handler
    database.ref(`rooms/${roomCode}/members/${currentUser.uid}/isActive`)
        .onDisconnect()
        .set(false);
}

// Update members list display
function updateMembersList(members) {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';
    
    const activeMembers = Object.entries(members)
        .filter(([uid, data]) => data.isActive)
        .sort((a, b) => a[1].joinedAt - b[1].joinedAt);
    
    activeMembers.forEach(([uid, data]) => {
        const item = document.createElement('div');
        item.className = `player-item ${data.ready ? 'player-ready' : ''}`;
        
        item.innerHTML = `
            <div class="player-name">
                ${data.isHost ? '👑 ' : ''}${data.username}
                ${uid === currentUser.uid ? ' (You)' : ''}
            </div>
            <div class="player-status">
                <span class="status-indicator ${data.ready ? 'ready' : ''}"></span>
                ${data.ready ? 'Ready' : 'Not Ready'}
            </div>
        `;
        
        playersList.appendChild(item);
    });
    
    // Check if can start game
    const playerCount = activeMembers.length;
    if (isHost && playerCount >= 2 && playerCount <= 4) {
        const allReady = activeMembers.every(([uid, data]) => data.ready || data.isHost);
        document.getElementById('startGameBtn').classList.remove('hidden');
        document.getElementById('startGameBtn').disabled = !allReady;
    }
    
    // Show 3-player settings if applicable
    if (isHost && playerCount === 3) {
        document.getElementById('gameSettings').classList.remove('hidden');
        document.getElementById('threePlayerSettings').classList.remove('hidden');
        populateCardOptions();
    } else {
        document.getElementById('threePlayerSettings').classList.add('hidden');
    }
}

// Toggle ready status
async function toggleReady() {
    if (!currentRoom || !currentUser) return;
    
    try {
        const snapshot = await database.ref(`rooms/${currentRoom}/members/${currentUser.uid}/ready`).once('value');
        const currentReady = snapshot.val() || false;
        
        await database.ref(`rooms/${currentRoom}/members/${currentUser.uid}/ready`).set(!currentReady);
        
        const btn = document.getElementById('readyBtn');
        btn.textContent = !currentReady ? 'Not Ready' : 'Ready';
        btn.style.background = !currentReady ? 'var(--warning-color)' : 'var(--success-color)';
        
    } catch (error) {
        console.error('Error toggling ready:', error);
        showError('Failed to update ready status');
    }
}

// Start game
async function startGame() {
    if (!isHost || !currentRoom) return;
    
    try {
        showLoading(true);
        
        const snapshot = await database.ref(`rooms/${currentRoom}/members`).once('value');
        const members = snapshot.val();
        const activeMembers = Object.entries(members).filter(([uid, data]) => data.isActive);
        
        const playerCount = activeMembers.length;
        
        if (playerCount < 2 || playerCount > 4) {
            showError('Need 2-4 players to start');
            return;
        }
        
        // Create deck and shuffle with fairness check
        let deck, hands, removedCard = null;
        const playerIds = activeMembers.map(([uid]) => uid);
        let reshuffleAttempts = 0;
        const MAX_RESHUFFLE = 10;
        
        // Keep dealing until we get a fair distribution
        do {
            deck = createDeck();
            deck = shuffleArray(deck);
            
            // Handle 3-player card removal
            if (playerCount === 3) {
                const removeMethod = document.querySelector('input[name="removeMethod"]:checked').value;
                if (removeMethod === 'random') {
                    const randomIndex = Math.floor(Math.random() * deck.length);
                    removedCard = deck.splice(randomIndex, 1)[0];
                } else {
                    removedCard = document.getElementById('cardToRemove').value;
                    if (!removedCard) {
                        showError('Please select a card to remove for 3-player mode');
                        return;
                    }
                    const cardIndex = deck.indexOf(removedCard);
                    if (cardIndex !== -1) {
                        deck.splice(cardIndex, 1);
                    }
                }
            }
            
            // Deal cards
            const cardsPerPlayer = Math.floor(deck.length / playerCount);
            hands = {};
            
            playerIds.forEach((uid, index) => {
                const startIndex = index * cardsPerPlayer;
                const hand = deck.slice(startIndex, startIndex + cardsPerPlayer);
                hands[uid] = sortCards(hand);
            });
            
            reshuffleAttempts++;
            
            // Check if distribution is fair
            const isFair = checkFairDistribution(hands);
            if (isFair) {
                console.log('Fair distribution achieved!');
                break;
            } else {
                console.log(`Unfair distribution, reshuffling... (attempt ${reshuffleAttempts})`);
            }
            
        } while (reshuffleAttempts < MAX_RESHUFFLE);
        
        if (reshuffleAttempts >= MAX_RESHUFFLE) {
            console.warn('Max reshuffles reached, using current distribution');
        }
        
        // Determine first player (who has 7H)
        let firstPlayer = null;
        for (const [uid, hand] of Object.entries(hands)) {
            if (hand.includes('7H')) {
                firstPlayer = uid;
                break;
            }
        }
        
        if (!firstPlayer) {
            firstPlayer = playerIds[0];
        }
        
        // Create players data
        const playersData = {};
        playerIds.forEach(uid => {
            playersData[uid] = {
                username: members[uid].username,
                ready: false,
                cardsCount: hands[uid].length,
                finalScore: 0,
                finishPosition: null,
                connected: true
            };
        });
        
        // Update room with game data
        const updates = {};
        updates[`rooms/${currentRoom}/players`] = playersData;
        updates[`rooms/${currentRoom}/gameState`] = {
            started: true,
            currentTurn: firstPlayer,
            turnNumber: 0,
            turnStartTime: firebase.database.ServerValue.TIMESTAMP,
            finished: false,
            winner: null
        };
        updates[`rooms/${currentRoom}/board`] = createEmptyBoard();
        
        // Store removed card if 3-player game
        if (removedCard) {
            updates[`rooms/${currentRoom}/metadata/removedCard`] = removedCard;
        }
        
        // Save hands
        playerIds.forEach(uid => {
            updates[`rooms/${currentRoom}/hands/${uid}/cards`] = hands[uid];
            updates[`rooms/${currentRoom}/hands/${uid}/lastUpdate`] = firebase.database.ServerValue.TIMESTAMP;
        });
        
        await database.ref().update(updates);
        
        showSuccess('Game starting...');
        
    } catch (error) {
        console.error('Error starting game:', error);
        showError('Failed to start game');
    } finally {
        showLoading(false);
    }
}

// Leave room
async function leaveRoom() {
    if (!currentRoom || !currentUser) return;
    
    const confirmLeave = confirm('Are you sure you want to leave this room?');
    if (!confirmLeave) return;
    
    try {
        showLoading(true);
        
        // Mark as inactive
        await database.ref(`rooms/${currentRoom}/members/${currentUser.uid}/isActive`).set(false);
        
        // Remove from user's active rooms
        await database.ref(`userRooms/${currentUser.uid}/activeRooms/${currentRoom}`).remove();
        
        // Clean up listeners
        database.ref(`rooms/${currentRoom}`).off();
        
        currentRoom = null;
        isHost = false;
        
        showLobby();
        showSuccess('Left room');
        
    } catch (error) {
        console.error('Error leaving room:', error);
        showError('Failed to leave room');
    } finally {
        showLoading(false);
    }
}

// Helper functions
// Note: createEmptyBoard() is now in helpers.js

// Check if card distribution is fair
function checkFairDistribution(hands) {
    for (const [uid, hand] of Object.entries(hands)) {
        // Count kings in hand
        const kingsCount = hand.filter(card => card.startsWith('K')).length;
        
        // Unfair if 3 or more kings (very hard to play)
        if (kingsCount >= 3) {
            console.log(`Unfair: Player has ${kingsCount} kings`);
            return false;
        }
        
        // Count aces (also hard to play)
        const acesCount = hand.filter(card => card.startsWith('A')).length;
        
        // Unfair if 3 or more aces
        if (acesCount >= 3) {
            console.log(`Unfair: Player has ${acesCount} aces`);
            return false;
        }
        
        // Count high cards (K, Q, J) - generally harder to play
        const highCards = hand.filter(card => {
            const rank = card.slice(0, -1);
            return rank === 'K' || rank === 'Q' || rank === 'J';
        }).length;
        
        // Very unfair if more than 8 high cards (out of 13)
        if (highCards >= 9) {
            console.log(`Unfair: Player has ${highCards} high cards (K,Q,J)`);
            return false;
        }
        
        // Count 7s - having 0 sevens can be challenging
        const sevensCount = hand.filter(card => card.startsWith('7')).length;
        
        // Check if no one got 7H
        const has7H = Object.values(hands).some(h => h.includes('7H'));
        if (!has7H) {
            console.log('Unfair: No player has 7♥');
            return false;
        }
        
        // Fair distribution
    }
    
    console.log('Distribution is fair!');
    return true;
}

async function checkIfHost(roomCode) {
    const snapshot = await database.ref(`rooms/${roomCode}/metadata/host`).once('value');
    isHost = snapshot.val() === currentUser.uid;
}

function populateCardOptions() {
    const select = document.getElementById('cardToRemove');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select card to remove...</option>';
    
    const deck = createDeck();
    deck.forEach(card => {
        const { rank, suit } = parseCard(card);
        const suitName = SUIT_NAMES[suit];
        const option = document.createElement('option');
        option.value = card;
        option.textContent = `${rank} of ${suitName}`;
        select.appendChild(option);
    });
}

function copyRoomCode() {
    const roomCode = document.getElementById('currentRoomCode').textContent;
    copyToClipboard(roomCode);
}

// Show lobby
function showLobby() {
    hideAllSections();
    document.getElementById('lobbySection').classList.remove('hidden');
    loadActiveRooms();
}

// Load active rooms
async function loadActiveRooms() {
    if (!currentUser) return;
    
    try {
        const snapshot = await database.ref(`userRooms/${currentUser.uid}/activeRooms`).once('value');
        const rooms = snapshot.val() || {};
        
        const roomsList = document.getElementById('activeRoomsList');
        roomsList.innerHTML = '';
        
        if (Object.keys(rooms).length === 0) {
            roomsList.innerHTML = '<p class="no-data">No active rooms</p>';
            return;
        }
        
        for (const [roomCode, data] of Object.entries(rooms)) {
            // Verify room still exists
            const roomSnapshot = await database.ref(`rooms/${roomCode}`).once('value');
            if (!roomSnapshot.exists()) {
                // Clean up dead reference
                await database.ref(`userRooms/${currentUser.uid}/activeRooms/${roomCode}`).remove();
                continue;
            }
            
            const roomData = roomSnapshot.val();
            const card = document.createElement('div');
            card.className = 'room-card';
            card.onclick = () => rejoinRoom(roomCode);
            
            card.innerHTML = `
                <h4>${data.roomName}</h4>
                <div class="room-details">
                    <span>Code: ${roomCode}</span>
                    <span>Last played: ${formatTime(data.lastPlayed)}</span>
                </div>
                <span class="room-badge badge-${roomData.metadata.type}">
                    ${roomData.metadata.type === 'session' ? 'Session' : 'Single'}
                </span>
            `;
            
            roomsList.appendChild(card);
        }
    } catch (error) {
        console.error('Error loading active rooms:', error);
    }
}

// Rejoin room
async function rejoinRoom(roomCode) {
    document.getElementById('roomCode').value = roomCode;
    await joinRoom();
}

// Show/hide public rooms
async function showPublicRooms() {
    const publicList = document.getElementById('publicRoomsList');
    const isHidden = publicList.classList.contains('hidden');
    
    if (isHidden) {
        publicList.classList.remove('hidden');
        await loadPublicRooms();
    } else {
        publicList.classList.add('hidden');
    }
}

// Load public rooms
async function loadPublicRooms() {
    try {
        const snapshot = await database.ref('publicRooms').once('value');
        const rooms = snapshot.val() || {};
        
        const grid = document.getElementById('publicRoomsGrid');
        grid.innerHTML = '';
        
        if (Object.keys(rooms).length === 0) {
            grid.innerHTML = '<p class="no-data">No public rooms available</p>';
            return;
        }
        
        for (const [roomCode, data] of Object.entries(rooms)) {
            const card = document.createElement('div');
            card.className = 'room-card';
            card.onclick = () => {
                document.getElementById('roomCode').value = roomCode;
                joinRoom();
            };
            
            card.innerHTML = `
                <h4>${data.roomName}</h4>
                <div class="room-details">
                    <span>Code: ${roomCode}</span>
                    <span>Players: ${data.currentPlayers}/${data.maxPlayers}</span>
                    <span>Created: ${formatTime(data.created)}</span>
                </div>
                <span class="room-badge badge-${data.type}">
                    ${data.type === 'session' ? 'Session' : 'Single'}
                </span>
            `;
            
            grid.appendChild(card);
        }
    } catch (error) {
        console.error('Error loading public rooms:', error);
        showError('Failed to load public rooms');
    }
}

// View game history
async function viewGameHistory() {
    if (!currentRoom) return;
    
    try {
        const snapshot = await database.ref(`rooms/${currentRoom}/gameHistory`).once('value');
        const history = snapshot.val() || {};
        
        const modal = document.getElementById('gameHistoryModal');
        const content = document.getElementById('gameHistoryContent');
        
        if (Object.keys(history).length === 0) {
            content.innerHTML = '<p class="no-data">No games played yet</p>';
        } else {
            let html = '<div class="history-list">';
            
            Object.entries(history).reverse().forEach(([gameId, game]) => {
                html += `
                    <div class="history-item">
                        <h4>Game ${gameId}</h4>
                        <p>Played: ${formatTime(game.timestamp)}</p>
                        <div class="history-results">
                            ${Object.entries(game.results).map(([uid, result]) => `
                                <div>${result.position}. ${result.username}: ${result.score} pts</div>
                            `).join('')}
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            content.innerHTML = html;
        }
        
        modal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading game history:', error);
        showError('Failed to load game history');
    }
}

function closeGameHistory() {
    document.getElementById('gameHistoryModal').classList.add('hidden');
}

// Leaderboard functions
async function showLeaderboard() {
    document.getElementById('leaderboardModal').classList.remove('hidden');
    await loadLeaderboardData('daily');
}

function closeLeaderboard() {
    document.getElementById('leaderboardModal').classList.add('hidden');
}

async function switchLeaderboardTab(type) {
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    await loadLeaderboardData(type);
}

async function loadLeaderboardData(type) {
    const content = document.getElementById('leaderboardContent');
    content.innerHTML = '<div class="loading">Loading...</div>';
    
    try {
        let dataRef;
        
        switch(type) {
            case 'daily':
                dataRef = database.ref(`leaderboard/daily/${getCurrentDateString()}`);
                break;
            case 'weekly':
                dataRef = database.ref(`leaderboard/weekly/${getCurrentWeekString()}`);
                break;
            case 'allTime':
                dataRef = database.ref('leaderboard/allTime');
                break;
        }
        
        const snapshot = await dataRef.once('value');
        const data = snapshot.val() || {};
        
        const players = Object.entries(data)
            .map(([uid, stats]) => ({ uid, ...stats }))
            .sort((a, b) => (b.gamesWon || 0) - (a.gamesWon || 0));
        
        if (players.length === 0) {
            content.innerHTML = '<p class="no-data">No data available yet</p>';
        } else {
            // Fetch usernames - ensure they exist
            const playersWithUsernames = await Promise.all(players.slice(0, 10).map(async (player) => {
                // Use getUserUsername which ensures username exists
                let username = await getUserUsername(player.uid);
                
                // If still null, something went wrong - log it
                if (!username) {
                    console.error(`Failed to get username for ${player.uid}`);
                    username = `User_${player.uid.slice(0, 6)}`;
                }
                
                return { ...player, username };
            }));
            
            let html = '<div class="leaderboard-list">';
            
            playersWithUsernames.forEach((player, index) => {
                const medal = getPositionMedal(index + 1);
                const isCurrentUser = player.uid === currentUser?.uid;
                
                html += `
                    <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}">
                        <span class="rank">${medal} #${index + 1}</span>
                        <span class="username">${player.username}</span>
                        <span class="stats">
                            <span class="games">${player.gamesWon || 0} wins</span>
                            <span class="points">${player.totalPoints || 0} pts</span>
                        </span>
                    </div>
                `;
            });
            
            html += '</div>';
            content.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        content.innerHTML = '<p class="error">Failed to load leaderboard</p>';
    }
}

