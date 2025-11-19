// Game UI Rendering Functions

// Track last played card for highlighting
let lastPlayedCard = null;

// Initialize playable cards setting from room
async function initPlayableCardsSetting() {
    if (!roomCode) return;
    
    await initPlayableCardsForGame(roomCode, (newValue) => {
        // Re-render hand when setting changes
        if (gameState) {
            renderPlayerHand(gameState.getMyHand());
        }
    });
}

// Note: getPlayableCardsSetting() is available from playable-cards-settings.js module

// Toggle playable cards setting (host only)
async function togglePlayableCards() {
    if (!roomCode) return;
    
    const gameData = gameState.getGameData();
    const isHost = gameData?.metadata?.host === currentUser.uid;
    
    if (!isHost) {
        showError('Only the host can control this setting');
        return;
    }
    
    const current = getPlayableCardsSetting();
    const newValue = !current;
    
    try {
        await updatePlayableCardsSetting(roomCode, newValue);
        updatePlayableCardsUI(newValue);
        renderPlayerHand(gameState.getMyHand());
        showToast(
            newValue 
                ? 'Playable cards highlighting enabled for all players' 
                : 'Playable cards highlighting disabled for all players', 
            'info'
        );
    } catch (error) {
        showError('Failed to update setting');
    }
}

// Render the game board
function renderBoard(board, lastAction = null) {
    // Safety check: ensure board exists
    if (!board) {
        console.warn('Board is undefined, skipping render');
        return;
    }
    
    // Track the most recently played card
    if (lastAction && lastAction.type === 'play' && lastAction.player !== currentUser.uid) {
        lastPlayedCard = lastAction.card;
    }
    
    for (const suitName in board) {
        const suitBoard = board[suitName];
        const sequenceContainer = document.getElementById(`${suitName}Sequence`);
        
        if (!sequenceContainer) {
            continue;
        }
        
        // Safety check: ensure suitBoard has required properties
        if (!suitBoard) {
            continue;
        }
        
        // Normalize the board data (Firebase may convert empty arrays to null)
        const normalizedSuit = {
            seven: suitBoard.seven || false,
            sequence: suitBoard.sequence || [],
            up: suitBoard.up || [],
            down: suitBoard.down || []
        };
        
        sequenceContainer.innerHTML = '';
        
        if (!normalizedSuit.seven && normalizedSuit.sequence.length === 0) {
            // Suit not yet opened
            const emptySlot = document.createElement('div');
            emptySlot.className = 'empty-slot';
            emptySlot.textContent = `Play 7${SUIT_SYMBOLS[SUITS[suitName.toUpperCase()]]} to open`;
            sequenceContainer.appendChild(emptySlot);
        } else {
            // Render downward sequence (6, 5, 4, 3, 2, A)
            if (normalizedSuit.down.length > 0) {
                normalizedSuit.down.slice().reverse().forEach(card => {
                    const cardElement = createBoardCardElement(card);
                    // Highlight if this is the last played card by another player
                    if (card === lastPlayedCard && lastAction && lastAction.player !== currentUser.uid) {
                        cardElement.classList.add('recently-played');
                    }
                    sequenceContainer.appendChild(cardElement);
                });
            }
            
            // Render the 7
            if (normalizedSuit.seven && normalizedSuit.sequence.length > 0) {
                const seven = normalizedSuit.sequence.find(c => c.startsWith('7'));
                if (seven) {
                    const cardElement = createBoardCardElement(seven);
                    // Highlight if this is the last played card by another player
                    if (seven === lastPlayedCard && lastAction && lastAction.player !== currentUser.uid) {
                        cardElement.classList.add('recently-played');
                    }
                    sequenceContainer.appendChild(cardElement);
                }
            }
            
            // Render upward sequence (8, 9, 10, J, Q, K)
            if (normalizedSuit.up.length > 0) {
                normalizedSuit.up.forEach(card => {
                    const cardElement = createBoardCardElement(card);
                    // Highlight if this is the last played card by another player
                    if (card === lastPlayedCard && lastAction && lastAction.player !== currentUser.uid) {
                        cardElement.classList.add('recently-played');
                    }
                    sequenceContainer.appendChild(cardElement);
                });
            }
        }
    }
    
    // Clear highlight after 3 seconds
    if (lastPlayedCard) {
        setTimeout(() => {
            lastPlayedCard = null;
            // Re-render board to remove highlight
            const gameData = gameState?.getGameData();
            if (gameData?.board) {
                renderBoard(gameData.board, null);
            }
        }, 3000);
    }
}

// Create a card element for the board
function createBoardCardElement(cardStr) {
    const div = document.createElement('div');
    div.innerHTML = getCardHTML(cardStr);
    const cardElement = div.firstElementChild;
    // Add data attribute for easy identification
    if (cardElement) {
        cardElement.dataset.card = cardStr;
    }
    return cardElement;
}

// Render player's hand
function renderPlayerHand(hand) {
    const handContainer = document.getElementById('playerHand');
    if (!handContainer) {
        return;
    }
    
    handContainer.innerHTML = '';
    
    // Safety check: ensure hand exists
    if (!hand || hand.length === 0) {
        handContainer.innerHTML = '<p class="no-data">No cards</p>';
        return;
    }
    
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'cards-container';
    
    // Sort hand
    const sortedHand = sortCards([...hand]);
    
    // Get playable cards if setting is enabled
    const showPlayable = getPlayableCardsSetting();
    let playableCards = [];
    if (showPlayable) {
        const gameData = gameState.getGameData();
        const board = gameData?.board;
        playableCards = getPlayableCards(hand, board);
    }
    
    // Render each card
    sortedHand.forEach(cardStr => {
        const isPlayable = showPlayable && playableCards.includes(cardStr);
        const cardElement = createPlayerCardElement(cardStr, isPlayable);
        cardsContainer.appendChild(cardElement);
    });
    
    handContainer.appendChild(cardsContainer);
    updateCardsRemaining(hand.length);
}

// Create a card element for player's hand
function createPlayerCardElement(cardStr, isPlayable = false) {
    const { rank, suit } = parseCard(cardStr);
    const color = SUIT_COLORS[suit];
    const symbol = SUIT_SYMBOLS[suit];
    
    const card = document.createElement('div');
    // Add playable class if highlighting is enabled and card is playable
    const showPlayable = getPlayableCardsSetting();
    if (showPlayable && isPlayable) {
        card.className = `card ${color} playable`;
    } else {
        card.className = `card ${color}`;
    }
    card.dataset.card = cardStr;
    
    // All cards are clickable when it's your turn (validation will reject invalid ones)
    if (gameState.isMyTurn()) {
        card.onclick = () => playCardAction(cardStr);
        card.style.cursor = 'pointer';
    } else {
        card.style.cursor = 'not-allowed';
        card.style.opacity = '0.6';
    }
    
    // Simplified: just rank and suit symbol, no overlapping corners
    card.innerHTML = `
        <div class="card-rank">${rank}</div>
        <div class="card-suit">${symbol}</div>
    `;
    
    return card;
}

// Render opponents
function renderOpponents(players) {
    // Safety check: ensure players exists
    if (!players || !currentUser) {
        return;
    }
    
    const opponentsArea = document.getElementById('opponentsArea');
    const opponents = Object.entries(players).filter(([uid]) => uid !== currentUser.uid);
    
    // Hide all opponent slots first
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`opponent${i}`).style.display = 'none';
    }
    
    // Render each opponent
    opponents.forEach(([uid, playerData], index) => {
        const opponentElement = document.getElementById(`opponent${index + 1}`);
        if (opponentElement) {
            opponentElement.style.display = 'block';
            
            // Check if it's their turn
            const gameData = gameState.getGameData();
            if (gameData?.gameState?.currentTurn === uid) {
                opponentElement.classList.add('active-turn');
            } else {
                opponentElement.classList.remove('active-turn');
            }
            
            opponentElement.querySelector('.player-name').textContent = playerData.username;
            opponentElement.querySelector('.card-count').textContent = `${playerData.cardsCount} cards`;
            
            // Render card backs
            const cardsContainer = opponentElement.querySelector('.opponent-cards');
            cardsContainer.innerHTML = '';
            
            for (let i = 0; i < Math.min(playerData.cardsCount, 13); i++) {
                const cardBack = document.createElement('div');
                cardBack.className = 'card-back';
                cardsContainer.appendChild(cardBack);
            }
        }
    });
}

// Update turn indicator
function updateTurnIndicator(gameStateData) {
    const indicator = document.getElementById('turnIndicator');
    
    // Safety check: ensure elements exist
    if (!indicator || !gameStateData) {
        return;
    }
    
    if (!gameStateData.started) {
        indicator.textContent = 'Waiting...';
        indicator.classList.remove('your-turn');
        return;
    }
    
    if (gameStateData.finished) {
        indicator.textContent = 'Game Over!';
        indicator.classList.remove('your-turn');
        return;
    }
    
    const isMyTurn = gameStateData.currentTurn === currentUser.uid;
    
    if (isMyTurn) {
        indicator.textContent = 'Your Turn!';
        indicator.classList.add('your-turn');
    } else {
        const players = gameState.getPlayers();
        const currentPlayer = players[gameStateData.currentTurn];
        indicator.textContent = `${currentPlayer?.username || 'Player'}'s Turn`;
        indicator.classList.remove('your-turn');
    }
}

// Update pass button
function updatePassButton() {
    const passBtn = document.getElementById('passBtn');
    
    // Safety check: ensure button exists
    if (!passBtn || !gameState) {
        return;
    }
    
    const isMyTurn = gameState.isMyTurn();
    
    if (!isMyTurn) {
        passBtn.disabled = true;
        passBtn.textContent = 'Pass (Not Your Turn)';
        passBtn.style.opacity = '0.5';
        return;
    }
    
    const gameData = gameState.getGameData();
    const board = gameData?.board;
    const myHand = gameState.getMyHand();
    const canPlay = canMakeAnyMove(myHand, board);
    
    
    if (canPlay) {
        // Has playable cards - cannot pass
        passBtn.disabled = true;
        passBtn.textContent = 'Pass (You have playable cards)';
        passBtn.style.opacity = '0.5';
    } else {
        // No playable cards - can pass
        passBtn.disabled = false;
        passBtn.textContent = 'Pass Turn';
        passBtn.style.opacity = '1';
        passBtn.style.background = 'var(--warning-color)';
        passBtn.style.color = 'white';
    }
}

// Update cards remaining display
function updateCardsRemaining(count) {
    const cardsRemainingElement = document.getElementById('cardsRemaining');
    cardsRemainingElement.textContent = `${count} card${count !== 1 ? 's' : ''}`;
}

// Update game status
function updateGameStatus() {
    // Update any additional status information
    updatePassButton();
}

// Show game over modal
async function showGameOverModal(rankings) {
    console.log('🎊 showGameOverModal called with rankings:', rankings);
    
    const modal = document.getElementById('gameOverModal');
    const resultsContainer = document.getElementById('gameResults');
    
    console.log('Modal element:', modal);
    console.log('Results container:', resultsContainer);
    
    if (!modal) {
        console.error('gameOverModal not found in DOM!');
        alert('Game Over! Scores calculated. Please check console for results.');
        console.log('Rankings:', rankings);
        return;
    }
    
    if (!resultsContainer) {
        console.error('gameResults container not found!');
        return;
    }
    
    resultsContainer.innerHTML = '<p>Loading results...</p>';
    console.log('Loading results...');
    
    // Get players data from game state (has usernames)
    const gameData = gameState.getGameData();
    const players = gameData?.players || {};
    
    // Load all usernames first (use players data if available, otherwise fetch)
    const resultsPromises = rankings.map(async (entry) => {
        // Try to get username from players data first (most reliable)
        let username = players[entry.uid]?.username;
        
        // If not in players data, fetch from user profile
        if (!username) {
            username = await getUserUsername(entry.uid);
        }
        
        // Ensure username exists (getUserUsername should have created it)
        if (!username) {
            console.error(`Failed to get username for ${entry.uid}`);
            username = `User_${entry.uid.slice(0, 6)}`;
        }
        
        const resultItem = document.createElement('div');
        resultItem.className = `result-item ${entry.position === 1 ? 'winner' : ''}`;
        
        const medal = getPositionMedal(entry.position);
        
        resultItem.innerHTML = `
            <span class="position">${medal || `#${entry.position}`}</span>
            <span class="player-name">${username}${entry.uid === currentUser.uid ? ' (You)' : ''}</span>
            <span class="score">${formatScore(entry.score)}</span>
        `;
        
        return resultItem;
    });
    
    // Wait for all results to be ready
    const resultElements = await Promise.all(resultsPromises);
    
    // Clear and populate results
    resultsContainer.innerHTML = '';
    resultElements.forEach(elem => resultsContainer.appendChild(elem));
    
    // Check if session room and show session update (gameData already loaded above)
    const playAgainBtn = document.getElementById('playAgainBtn');
    const isHost = gameData.metadata.host === currentUser.uid;
    
    if (gameData.metadata.type === 'session') {
        if (playAgainBtn) {
            playAgainBtn.style.display = 'block';
            if (isHost) {
                playAgainBtn.disabled = false;
                playAgainBtn.textContent = 'Play Again (Host)';
            } else {
                playAgainBtn.disabled = true;
                playAgainBtn.textContent = 'Waiting for Host...';
                playAgainBtn.style.opacity = '0.6';
            }
        }
        showSessionUpdate();
    } else {
        // Hide play again button for single games
        if (playAgainBtn) playAgainBtn.style.display = 'none';
    }
    
    modal.classList.remove('hidden');
}

// Show session update in game over modal
async function showSessionUpdate() {
    const sessionUpdate = document.getElementById('sessionUpdate');
    const updateContent = document.getElementById('sessionUpdateContent');
    
    sessionUpdate.classList.remove('hidden');
    
    const gameData = gameState.getGameData();
    const leaderboard = gameData.sessionLeaderboard || {};
    
    if (Object.keys(leaderboard).length === 0) {
        updateContent.innerHTML = '<p>Session statistics updating...</p>';
        return;
    }
    
    // Get sorted standings
    const standings = Object.entries(leaderboard)
        .map(([uid, stats]) => ({ uid, ...stats }))
        .sort((a, b) => a.totalPoints - b.totalPoints);
    
    if (standings.length > 0) {
        const leader = standings[0];
        const medal = '🏆';
        
        // Fetch username - ensure it exists
        let username = await getUserUsername(leader.uid);
        
        // If still null, something went wrong - log it
        if (!username) {
            console.error(`Failed to get username for ${leader.uid}`);
            username = `User_${leader.uid.slice(0, 6)}`;
        }
        
        updateContent.innerHTML = `
            <div class="session-leader">
                <h4>${medal} Current Leader</h4>
                <p><strong>${username}</strong></p>
                <p>${leader.totalPoints} total points (${leader.gamesWon} wins)</p>
            </div>
            <div class="session-progress">
                <p>Games played: ${leader.gamesPlayed}</p>
                ${gameData.metadata.settings.targetScore ? 
                    `<p>Target: ${gameData.metadata.settings.targetScore} points</p>` : ''}
            </div>
        `;
    }
}

// Animation helpers
function animateCardPlay(cardElement) {
    if (cardElement) {
        animateElement(cardElement, 'played', 500);
    }
}

