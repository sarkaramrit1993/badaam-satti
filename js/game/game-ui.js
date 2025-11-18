// Game UI Rendering Functions

// Render the game board
function renderBoard(board) {
    // Safety check: ensure board exists
    if (!board) {
        console.warn('Board is undefined, skipping render');
        return;
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
                    sequenceContainer.appendChild(createBoardCardElement(card));
                });
            }
            
            // Render the 7
            if (normalizedSuit.seven && normalizedSuit.sequence.length > 0) {
                const seven = normalizedSuit.sequence.find(c => c.startsWith('7'));
                if (seven) {
                    sequenceContainer.appendChild(createBoardCardElement(seven));
                }
            }
            
            // Render upward sequence (8, 9, 10, J, Q, K)
            if (normalizedSuit.up.length > 0) {
                normalizedSuit.up.forEach(card => {
                    sequenceContainer.appendChild(createBoardCardElement(card));
                });
            }
        }
    }
}

// Create a card element for the board
function createBoardCardElement(cardStr) {
    const div = document.createElement('div');
    div.innerHTML = getCardHTML(cardStr);
    return div.firstElementChild;
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
    
    // Get playable cards
    const gameData = gameState.getGameData();
    const board = gameData?.board;
    const playableCards = getPlayableCards(hand, board);
    
    // Render each card
    sortedHand.forEach(cardStr => {
        const cardElement = createPlayerCardElement(cardStr, playableCards.includes(cardStr));
        cardsContainer.appendChild(cardElement);
    });
    
    handContainer.appendChild(cardsContainer);
    updateCardsRemaining(hand.length);
}

// Create a card element for player's hand
function createPlayerCardElement(cardStr, isPlayable) {
    const { rank, suit } = parseCard(cardStr);
    const color = SUIT_COLORS[suit];
    const symbol = SUIT_SYMBOLS[suit];
    
    const card = document.createElement('div');
    card.className = `card ${color} ${isPlayable ? 'playable' : 'disabled'}`;
    card.dataset.card = cardStr;
    
    if (isPlayable && gameState.isMyTurn()) {
        card.onclick = () => playCardAction(cardStr);
        card.style.cursor = 'pointer';
    }
    
    card.innerHTML = `
        <div class="card-corners top-left">
            <span>${rank}</span>
            <span>${symbol}</span>
        </div>
        <div class="card-rank">${rank}</div>
        <div class="card-suit">${symbol}</div>
        <div class="card-corners bottom-right">
            <span>${rank}</span>
            <span>${symbol}</span>
        </div>
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
    
    if (!gameState.isMyTurn()) {
        passBtn.disabled = true;
        return;
    }
    
    const gameData = gameState.getGameData();
    const board = gameData?.board;
    const canPlay = canMakeAnyMove(gameState.getMyHand(), board);
    
    passBtn.disabled = canPlay; // Can only pass if no playable cards
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
    
    // Load all usernames first
    const resultsPromises = rankings.map(async (entry) => {
        const username = await getUserUsername(entry.uid);
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
    
    // Check if session room and show session update
    const gameData = gameState.getGameData();
    const playAgainBtn = document.getElementById('playAgainBtn');
    const isHost = gameData.metadata.host === currentUser.uid;
    
    console.log('Room type:', gameData.metadata.type, 'Is host:', isHost);
    
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
    console.log('✅ Game over modal displayed!');
    console.log('  Players:', rankings.length);
    console.log('  Room type:', gameData.metadata.type);
    console.log('  Is host:', isHost);
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
        
        updateContent.innerHTML = `
            <div class="session-leader">
                <h4>${medal} Current Leader</h4>
                <p><strong>${leader.username}</strong></p>
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

