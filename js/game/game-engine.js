// Game Engine - Main game logic

let gameState = null;
let roomCode = null;

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', async () => {
    // Check if user is authenticated
    if (!currentUser) {
        // Wait for auth state change
        await new Promise(resolve => {
            const unsubscribe = auth.onAuthStateChanged(user => {
                if (user) {
                    currentUser = user;
                    unsubscribe();
                    resolve();
                }
            });
        });
    }
    
    // Get room code from URL
    const urlParams = new URLSearchParams(window.location.search);
    roomCode = urlParams.get('room');
    
    if (!roomCode) {
        showError('No room code provided');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }
    
    try {
        showLoading(true);
        
        // Initialize game state
        gameState = new GameState(roomCode);
        await gameState.init();
        
        // Setup event handlers
        setupGameEventHandlers();
        
        // Initialize UI
        initializeGameUI();
        
        // Initialize activity feed
        initActivityFeed();
        
        showLoading(false);
        
    } catch (error) {
        console.error('Error initializing game:', error);
        showError('Failed to load game');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
});

// Setup event handlers for game state changes
function setupGameEventHandlers() {
    gameState.onGameStateChange = (newGameState) => {
        console.log('Game state changed, current turn:', newGameState.currentTurn, 'My UID:', currentUser.uid);
        updateTurnIndicator(newGameState);
        checkGameOver(newGameState);
        // Re-render hand when turn changes (playable cards change)
        renderPlayerHand(gameState.getMyHand());
        updatePassButton();
    };
    
    gameState.onBoardChange = (board) => {
        console.log('Board changed');
        renderBoard(board);
        // Re-render hand when board changes (playable cards may change)
        renderPlayerHand(gameState.getMyHand());
    };
    
    gameState.onPlayersChange = (players) => {
        renderOpponents(players);
        updateGameStatus();
    };
    
    gameState.onHandChange = (hand) => {
        console.log('Hand changed, cards:', hand.length);
        renderPlayerHand(hand);
        updatePassButton();
    };
}

// Initialize game UI
function initializeGameUI() {
    const roomCodeElement = document.getElementById('roomCode');
    if (roomCodeElement) {
        roomCodeElement.textContent = roomCode;
    }
    
    const gameData = gameState.getGameData();
    
    // Safety check: ensure gameData exists
    if (!gameData) {
        console.error('Game data not loaded');
        return;
    }
    
    renderBoard(gameData.board);
    renderOpponents(gameData.players);
    renderPlayerHand(gameState.getMyHand());
    updateTurnIndicator(gameData.gameState);
}

// Play a card
async function playCardAction(card) {
    if (!gameState.isMyTurn()) {
        showError('Not your turn!');
        return;
    }
    
    try {
        const gameData = gameState.getGameData();
        
        // Safety check: ensure gameData exists
        if (!gameData || !gameData.board || !gameData.players) {
            showError('Game data not loaded');
            return;
        }
        
        const validation = validateMove(
            currentUser.uid,
            card,
            gameData.gameState,
            gameData.players,
            gameData.board,
            gameData.hands
        );
        
        if (!validation.valid) {
            showError(validation.error);
            return;
        }
        
        // Update board (deep copy to avoid Firebase null conversion issues)
        const boardCopy = JSON.parse(JSON.stringify(gameData.board));
        // Ensure all arrays exist after JSON parse
        for (const suitName in boardCopy) {
            if (!boardCopy[suitName].sequence) boardCopy[suitName].sequence = [];
            if (!boardCopy[suitName].up) boardCopy[suitName].up = [];
            if (!boardCopy[suitName].down) boardCopy[suitName].down = [];
        }
        const newBoard = playCard(card, boardCopy);
        console.log('Board after playing', card, ':', JSON.stringify(newBoard));
        
        // Remove card from hand
        const newHand = gameState.getMyHand().filter(c => c !== card);
        
        // Get next player
        const nextPlayer = getNextPlayer(currentUser.uid, gameData.players);
        
        // Update database
        const updates = {};
        updates[`rooms/${roomCode}/board`] = newBoard;
        updates[`rooms/${roomCode}/hands/${currentUser.uid}/cards`] = newHand;
        updates[`rooms/${roomCode}/players/${currentUser.uid}/cardsCount`] = newHand.length;
        updates[`rooms/${roomCode}/gameState/currentTurn`] = nextPlayer;
        updates[`rooms/${roomCode}/gameState/turnNumber`] = firebase.database.ServerValue.increment(1);
        updates[`rooms/${roomCode}/gameState/lastAction`] = {
            type: 'play',
            player: currentUser.uid,
            card: card,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        // Check if player finished
        if (newHand.length === 0) {
            updates[`rooms/${roomCode}/gameState/finished`] = true;
            updates[`rooms/${roomCode}/gameState/winner`] = currentUser.uid;
        }
        
        // Update database first
        await database.ref().update(updates);
        
        // Then handle game over if finished
        if (newHand.length === 0) {
            console.log('Game finished! Calculating scores...');
            await handleGameOver();
        }
        
        showSuccess('Card played!');
        
    } catch (error) {
        console.error('Error playing card:', error);
        showError('Failed to play card');
    }
}

// Pass turn
async function passRound() {
    if (!gameState.isMyTurn()) {
        showError('Not your turn!');
        return;
    }
    
    try {
        const gameData = gameState.getGameData();
        
        // Safety check: ensure gameData exists
        if (!gameData || !gameData.board) {
            showError('Game data not loaded');
            return;
        }
        
        // Check if player actually can't play
        if (canMakeAnyMove(gameState.getMyHand(), gameData.board)) {
            showError('You have playable cards!');
            return;
        }
        
        // Get next player
        const nextPlayer = getNextPlayer(currentUser.uid, gameData.players);
        
        // Update turn
        const updates = {};
        updates[`rooms/${roomCode}/gameState/currentTurn`] = nextPlayer;
        updates[`rooms/${roomCode}/gameState/turnNumber`] = firebase.database.ServerValue.increment(1);
        updates[`rooms/${roomCode}/gameState/lastAction`] = {
            type: 'pass',
            player: currentUser.uid,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        await database.ref().update(updates);
        
        showWarning('Passed turn');
        
    } catch (error) {
        console.error('Error passing turn:', error);
        showError('Failed to pass turn');
    }
}

// Handle game over
async function handleGameOver() {
    try {
        const gameData = gameState.getGameData();
        const hands = gameData.hands;
        
        // Calculate final scores
        const scores = calculateFinalScores(hands);
        const rankings = getRankings(scores);
        
        // Update final scores in database
        const updates = {};
        rankings.forEach(entry => {
            updates[`rooms/${roomCode}/players/${entry.uid}/finalScore`] = entry.score;
            updates[`rooms/${roomCode}/players/${entry.uid}/finishPosition`] = entry.position;
        });
        updates[`rooms/${roomCode}/gameState/finalScores`] = scores;
        
        await database.ref().update(updates);
        
        // Update user stats and leaderboard
        await updateUserStats(rankings);
        await updateLeaderboards(rankings);
        
        // Handle session room updates
        const roomData = gameData;
        if (roomData.metadata.type === 'session') {
            await updateSessionStats(rankings);
        }
        
        // Show game over modal
        setTimeout(() => showGameOverModal(rankings), 1000);
        
    } catch (error) {
        console.error('Error handling game over:', error);
    }
}

// Update user stats after game
async function updateUserStats(rankings) {
    for (const entry of rankings) {
        const userRef = database.ref(`users/${entry.uid}/stats`);
        const snapshot = await userRef.once('value');
        const stats = snapshot.val() || {
            gamesPlayed: 0,
            gamesWon: 0,
            totalPoints: 0,
            averagePoints: 0
        };
        
        const newGamesPlayed = stats.gamesPlayed + 1;
        const newTotalPoints = stats.totalPoints + entry.score;
        const newGamesWon = entry.position === 1 ? stats.gamesWon + 1 : stats.gamesWon;
        
        await userRef.update({
            gamesPlayed: newGamesPlayed,
            gamesWon: newGamesWon,
            totalPoints: newTotalPoints,
            averagePoints: Math.round(newTotalPoints / newGamesPlayed),
            winRate: Math.round((newGamesWon / newGamesPlayed) * 100)
        });
    }
}

// Update leaderboards
async function updateLeaderboards(rankings) {
    const winner = rankings[0];
    const username = await getUserUsername(winner.uid);
    
    const dateStr = getCurrentDateString();
    const weekStr = getCurrentWeekString();
    
    // Update daily leaderboard
    await database.ref(`leaderboard/daily/${dateStr}/${winner.uid}`).set({
        username,
        gamesWon: firebase.database.ServerValue.increment(1),
        totalPoints: firebase.database.ServerValue.increment(winner.score),
        lastUpdated: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Update weekly leaderboard
    await database.ref(`leaderboard/weekly/${weekStr}/${winner.uid}`).set({
        username,
        gamesWon: firebase.database.ServerValue.increment(1),
        totalPoints: firebase.database.ServerValue.increment(winner.score),
        lastUpdated: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Update all-time leaderboard
    await database.ref(`leaderboard/allTime/${winner.uid}`).set({
        username,
        gamesWon: firebase.database.ServerValue.increment(1),
        totalPoints: firebase.database.ServerValue.increment(winner.score),
        lastUpdated: firebase.database.ServerValue.TIMESTAMP
    });
}

// Update session statistics
async function updateSessionStats(rankings) {
    const updates = {};
    
    for (const entry of rankings) {
        const username = await getUserUsername(entry.uid);
        const memberRef = `rooms/${roomCode}/members/${entry.uid}/sessionStats`;
        
        const snapshot = await database.ref(memberRef).once('value');
        const sessionStats = snapshot.val() || {
            gamesPlayed: 0,
            gamesWon: 0,
            totalPoints: 0,
            averagePoints: 0
        };
        
        const newGamesPlayed = sessionStats.gamesPlayed + 1;
        const newTotalPoints = sessionStats.totalPoints + entry.score;
        const newGamesWon = entry.position === 1 ? sessionStats.gamesWon + 1 : sessionStats.gamesWon;
        
        updates[memberRef] = {
            gamesPlayed: newGamesPlayed,
            gamesWon: newGamesWon,
            totalPoints: newTotalPoints,
            averagePoints: Math.round(newTotalPoints / newGamesPlayed)
        };
        
        // Update session leaderboard
        updates[`rooms/${roomCode}/sessionLeaderboard/${entry.uid}`] = {
            username,
            gamesPlayed: newGamesPlayed,
            gamesWon: newGamesWon,
            totalPoints: newTotalPoints,
            averagePoints: Math.round(newTotalPoints / newGamesPlayed)
        };
    }
    
    // Save game to history
    const gameId = Date.now();
    const gameResults = {};
    for (const entry of rankings) {
        const username = await getUserUsername(entry.uid);
        gameResults[entry.uid] = {
            username,
            position: entry.position,
            score: entry.score
        };
    }
    
    updates[`rooms/${roomCode}/gameHistory/${gameId}`] = {
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        results: gameResults
    };
    
    await database.ref().update(updates);
}

// Check if game is over
function checkGameOver(gameStateData) {
    if (gameStateData.finished && !gameStateData.gameOverHandled) {
        console.log('Game over detected, handling...');
        // Mark as handled to prevent multiple calls
        database.ref(`rooms/${roomCode}/gameState/gameOverHandled`).set(true);
        handleGameOver();
    }
}

// Leave game
function leaveGame() {
    const confirmLeave = confirm('Are you sure you want to leave the game?');
    if (!confirmLeave) return;
    
    if (gameState) {
        gameState.cleanup();
    }
    
    window.location.href = 'index.html';
}

// View stats (from game over modal)
function viewStats() {
    // TODO: Implement detailed stats view
    showSuccess('Stats feature coming soon!');
}

// Return to lobby (from game over modal)
function returnToLobby() {
    if (gameState) {
        gameState.cleanup();
    }
    window.location.href = 'index.html';
}

// Copy room code
function copyRoomCode() {
    copyToClipboard(roomCode);
}

// Play again (session rooms)
async function playAgain() {
    try {
        showLoading(true);
        
        // Reset game state
        const updates = {};
        updates[`rooms/${roomCode}/gameState/started`] = false;
        updates[`rooms/${roomCode}/gameState/finished`] = false;
        updates[`rooms/${roomCode}/gameState/winner`] = null;
        updates[`rooms/${roomCode}/gameState/currentTurn`] = null;
        updates[`rooms/${roomCode}/board`] = createEmptyBoard();
        updates[`rooms/${roomCode}/hands`] = {};
        updates[`rooms/${roomCode}/players`] = {};
        
        // Mark all members as not ready
        const snapshot = await database.ref(`rooms/${roomCode}/members`).once('value');
        const members = snapshot.val() || {};
        
        for (const uid in members) {
            if (members[uid].isActive) {
                updates[`rooms/${roomCode}/members/${uid}/ready`] = false;
            }
        }
        
        await database.ref().update(updates);
        
        // Return to lobby/waiting room
        window.location.href = `index.html`;
        
    } catch (error) {
        console.error('Error setting up next game:', error);
        showError('Failed to start next game');
    } finally {
        showLoading(false);
    }
}

// Return to lobby
function returnToLobby() {
    if (gameState) {
        gameState.cleanup();
    }
    window.location.href = 'index.html';
}

// View stats
function viewStats() {
    // Could implement a stats modal here
    showSuccess('Stats feature coming soon!');
}

