// Card Logic and Validation

// Check if a card can be played
function canPlayCard(card, board) {
    // Safety check: ensure board exists
    if (!board) {
        return false;
    }
    
    const { rank, suit } = parseCard(card);
    const suitName = SUIT_NAMES[suit];
    const suitBoard = board[suitName];
    
    // Safety check: ensure suit board exists
    if (!suitBoard) {
        return false;
    }
    
    // Normalize suit board data (Firebase may convert empty arrays to null)
    const normalizedSuit = {
        seven: suitBoard.seven || false,
        sequence: suitBoard.sequence || [],
        up: suitBoard.up || [],
        down: suitBoard.down || []
    };
    
    // Check if game has started (7H must be played first)
    // Game has started if ANY suit has been opened (seven = true) OR has cards in sequence
    let gameStarted = false;
    for (const suitName in board) {
        const s = board[suitName];
        if (!s) continue;
        
        const normalized = {
            seven: s.seven || false,
            sequence: Array.isArray(s.sequence) ? s.sequence : (s.sequence ? [s.sequence] : []),
            up: Array.isArray(s.up) ? s.up : (s.up ? [s.up] : []),
            down: Array.isArray(s.down) ? s.down : (s.down ? [s.down] : [])
        };
        
        if (normalized.seven || normalized.sequence.length > 0) {
            gameStarted = true;
            break;
        }
    }
    
    // Special case: 7H starts the game (must be first card)
    if (card === '7H') {
        // Can play 7H ONLY if no cards have been played yet
        const canPlay = !gameStarted;
        console.log(`Checking 7H: gameStarted=${gameStarted}, canPlay=${canPlay}`);
        return canPlay;
    }
    
    // If game hasn't started, ONLY 7H can be played
    if (!gameStarted) {
        console.log(`Game not started yet, blocking ${card} (only 7H allowed)`);
        return false;
    }
    
    // Check if this is a 7 (opens a new suit)
    if (rank === '7') {
        // Can play a 7 if that suit hasn't been opened yet
        const canPlay = !normalizedSuit.seven;
        console.log(`Checking ${card}: suit ${suitName} is ${normalizedSuit.seven ? 'opened' : 'closed'}, canPlay: ${canPlay}`);
        return canPlay;
    }
    
    // For non-7 cards, the suit must be opened (7 must be played first)
    if (!normalizedSuit.seven) {
        return false;
    }
    
    // Check if card can extend the sequence
    const rankIndex = RANK_INDICES[rank];
    
    // Check upward sequence (8, 9, 10, J, Q, K)
    if (rankIndex > 6) {
        const expectedNextRank = normalizedSuit.up.length > 0 
            ? RANK_INDICES[parseCard(normalizedSuit.up[normalizedSuit.up.length - 1]).rank] + 1
            : 7; // 8 is index 7, comes after 7 (index 6)
        
        if (rankIndex === expectedNextRank) {
            return true;
        }
    }
    
    // Check downward sequence (6, 5, 4, 3, 2, A)
    if (rankIndex < 6) {
        const expectedNextRank = normalizedSuit.down.length > 0
            ? RANK_INDICES[parseCard(normalizedSuit.down[normalizedSuit.down.length - 1]).rank] - 1
            : 5; // 6 is index 5, comes before 7 (index 6)
        
        if (rankIndex === expectedNextRank) {
            return true;
        }
    }
    
    return false;
}

// Get all playable cards from a hand
function getPlayableCards(hand, board) {
    // Safety check: ensure hand and board exist
    if (!hand || !board) {
        return [];
    }
    return hand.filter(card => canPlayCard(card, board));
}

// Play a card (update board)
function playCard(card, board) {
    const { rank, suit } = parseCard(card);
    const suitName = SUIT_NAMES[suit];
    const suitBoard = board[suitName];
    
    // Safety check: ensure suit board exists
    if (!suitBoard) {
        console.error('Suit board not found:', suitName);
        return board;
    }
    
    // Ensure arrays exist (Firebase may convert empty arrays to null)
    if (!suitBoard.sequence) suitBoard.sequence = [];
    if (!suitBoard.up) suitBoard.up = [];
    if (!suitBoard.down) suitBoard.down = [];
    
    // If it's a 7, mark the suit as opened
    if (rank === '7') {
        suitBoard.seven = true;
        suitBoard.sequence.push(card);
        return board;
    }
    
    const rankIndex = RANK_INDICES[rank];
    
    // Add to upward sequence (8-K)
    if (rankIndex > 6) {
        suitBoard.up.push(card);
        suitBoard.sequence.push(card);
    }
    // Add to downward sequence (6-A)
    else if (rankIndex < 6) {
        suitBoard.down.push(card);
        suitBoard.sequence.push(card);
    }
    
    return board;
}

// Check if a player can make any move
function canMakeAnyMove(hand, board) {
    // Safety check: ensure hand and board exist
    if (!hand || !board) {
        return false;
    }
    return hand.some(card => canPlayCard(card, board));
}

// Check if the game is over
function isGameOver(players) {
    return Object.values(players).some(player => player.cardsCount === 0);
}

// Get winner (player with 0 cards)
function getWinner(players) {
    const winner = Object.entries(players).find(([uid, player]) => player.cardsCount === 0);
    return winner ? winner[0] : null;
}

// Calculate final scores for all players
function calculateFinalScores(hands) {
    const scores = {};
    
    for (const [uid, handData] of Object.entries(hands)) {
        const cards = handData.cards || handData;
        scores[uid] = calculatePoints(cards);
    }
    
    return scores;
}

// Get player rankings based on scores
function getRankings(scores) {
    const rankings = Object.entries(scores)
        .map(([uid, score]) => ({ uid, score }))
        .sort((a, b) => a.score - b.score); // Lower score is better
    
    return rankings.map((entry, index) => ({
        ...entry,
        position: index + 1
    }));
}

// Validate game state
function validateGameState(gameState, players, board) {
    // Check if it's a valid turn
    if (!gameState.currentTurn) {
        return { valid: false, error: 'No current turn set' };
    }
    
    // Check if current player exists
    if (!players[gameState.currentTurn]) {
        return { valid: false, error: 'Current player not found' };
    }
    
    // Check if board is valid
    if (!board) {
        return { valid: false, error: 'Board not initialized' };
    }
    
    return { valid: true };
}

// Get next player in turn order
function getNextPlayer(currentPlayerId, players) {
    // Safety check: ensure players exists
    if (!players) {
        console.error('Players object is undefined');
        return null;
    }
    
    const playerIds = Object.keys(players).filter(uid => 
        players[uid] && players[uid].cardsCount > 0 // Only consider players who haven't finished
    );
    
    if (playerIds.length === 0) {
        return null; // Game is over
    }
    
    if (playerIds.length === 1) {
        return playerIds[0]; // Only one player left
    }
    
    const currentIndex = playerIds.indexOf(currentPlayerId);
    
    // If current player not found, return first player
    if (currentIndex === -1) {
        console.warn('Current player not found in active players, returning first player');
        return playerIds[0];
    }
    
    const nextIndex = (currentIndex + 1) % playerIds.length;
    
    return playerIds[nextIndex];
}

// Check if a sequence is complete
function isSequenceComplete(suitBoard) {
    // A sequence is complete if it has:
    // - The 7 (suit is opened)
    // - All upward cards (8-K = 6 cards)
    // - All downward cards (A-6 = 6 cards)
    
    return suitBoard.seven && 
           suitBoard.up.length === 6 && 
           suitBoard.down.length === 6;
}

// Get board statistics
function getBoardStats(board) {
    const stats = {
        totalCardsPlayed: 0,
        completedSuits: 0,
        openedSuits: 0
    };
    
    // Safety check: ensure board exists
    if (!board) {
        return stats;
    }
    
    for (const suitName in board) {
        const suitBoard = board[suitName];
        
        // Safety check: ensure suitBoard exists
        if (!suitBoard) {
            continue;
        }
        
        if (suitBoard.seven) {
            stats.openedSuits++;
            stats.totalCardsPlayed++; // Count the 7
        }
        
        if (suitBoard.up) {
            stats.totalCardsPlayed += suitBoard.up.length;
        }
        
        if (suitBoard.down) {
            stats.totalCardsPlayed += suitBoard.down.length;
        }
        
        if (isSequenceComplete(suitBoard)) {
            stats.completedSuits++;
        }
    }
    
    return stats;
}

// Validate a move before execution
function validateMove(playerId, card, gameState, players, board, hands) {
    // Safety checks: ensure all required parameters exist
    if (!gameState || !players || !board || !hands) {
        return { valid: false, error: 'Missing game data' };
    }
    
    // Check if it's the player's turn
    if (gameState.currentTurn !== playerId) {
        return { valid: false, error: 'Not your turn' };
    }
    
    // Check if game is started
    if (!gameState.started) {
        return { valid: false, error: 'Game not started' };
    }
    
    // Check if game is finished
    if (gameState.finished) {
        return { valid: false, error: 'Game already finished' };
    }
    
    // Check if player has the card
    if (!hands[playerId]) {
        return { valid: false, error: 'Player hand not found' };
    }
    
    const playerHand = hands[playerId].cards || hands[playerId];
    if (!playerHand || !Array.isArray(playerHand)) {
        return { valid: false, error: 'Invalid player hand' };
    }
    
    if (!playerHand.includes(card)) {
        return { valid: false, error: 'You do not have this card' };
    }
    
    // Check if the card can be played according to game rules
    if (!canPlayCard(card, board)) {
        return { valid: false, error: 'This card cannot be played' };
    }
    
    return { valid: true };
}

// Get hint for next playable card
function getPlayableCardHint(hand, board) {
    const playableCards = getPlayableCards(hand, board);
    
    if (playableCards.length === 0) {
        return { hasPlayableCards: false, message: 'No playable cards. You must pass.' };
    }
    
    // Prioritize 7H if available
    if (playableCards.includes('7H')) {
        return { 
            hasPlayableCards: true, 
            suggestion: '7H',
            message: '7 of Hearts starts the game!' 
        };
    }
    
    // Suggest playing 7s to open suits
    const sevens = playableCards.filter(card => card.startsWith('7'));
    if (sevens.length > 0) {
        return {
            hasPlayableCards: true,
            suggestion: sevens[0],
            message: `Play ${sevens[0]} to open a new suit`
        };
    }
    
    // Otherwise suggest any playable card
    return {
        hasPlayableCards: true,
        suggestion: playableCards[0],
        message: `You can play ${playableCards.length} card(s)`
    };
}

