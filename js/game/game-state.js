// Game State Management

class GameState {
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.listeners = [];
        this.gameData = null;
        this.myHand = [];
    }
    
    // Initialize and load game data
    async init() {
        try {
            const snapshot = await database.ref(`rooms/${this.roomCode}`).once('value');
            this.gameData = snapshot.val();
            
            if (!this.gameData) {
                throw new Error('Room not found');
            }
            
            await this.loadMyHand();
            this.setupListeners();
            
            return this.gameData;
        } catch (error) {
            console.error('Error initializing game state:', error);
            throw error;
        }
    }
    
    // Load current player's hand
    async loadMyHand() {
        const snapshot = await database.ref(`rooms/${this.roomCode}/hands/${currentUser.uid}/cards`).once('value');
        this.myHand = snapshot.val() || [];
    }
    
    // Setup real-time listeners
    setupListeners() {
        // Listen for game state changes
        this.listeners.push(
            database.ref(`rooms/${this.roomCode}/gameState`).on('value', (snapshot) => {
                if (this.gameData) {
                    this.gameData.gameState = snapshot.val();
                    this.onGameStateChange(this.gameData.gameState);
                }
            })
        );
        
        // Listen for board changes
        this.listeners.push(
            database.ref(`rooms/${this.roomCode}/board`).on('value', (snapshot) => {
                if (this.gameData) {
                    this.gameData.board = snapshot.val();
                    this.onBoardChange(this.gameData.board);
                }
            })
        );
        
        // Listen for player changes
        this.listeners.push(
            database.ref(`rooms/${this.roomCode}/players`).on('value', (snapshot) => {
                if (this.gameData) {
                    this.gameData.players = snapshot.val();
                    this.onPlayersChange(this.gameData.players);
                }
            })
        );
        
        // Listen for my hand changes
        this.listeners.push(
            database.ref(`rooms/${this.roomCode}/hands/${currentUser.uid}/cards`).on('value', (snapshot) => {
                this.myHand = snapshot.val() || [];
                this.onHandChange(this.myHand);
            })
        );
    }
    
    // Remove all listeners
    cleanup() {
        database.ref(`rooms/${this.roomCode}/gameState`).off();
        database.ref(`rooms/${this.roomCode}/board`).off();
        database.ref(`rooms/${this.roomCode}/players`).off();
        database.ref(`rooms/${this.roomCode}/hands/${currentUser.uid}/cards`).off();
        this.listeners = [];
    }
    
    // Event handlers (to be overridden)
    onGameStateChange(gameState) {
        // Override in game-engine.js
    }
    
    onBoardChange(board) {
        // Override in game-engine.js
    }
    
    onPlayersChange(players) {
        // Override in game-engine.js
    }
    
    onHandChange(hand) {
        // Override in game-engine.js
    }
    
    // Get current game data
    getGameData() {
        return this.gameData;
    }
    
    // Get my hand
    getMyHand() {
        return this.myHand;
    }
    
    // Check if it's my turn
    isMyTurn() {
        return this.gameData?.gameState?.currentTurn === currentUser.uid;
    }
    
    // Get current turn player
    getCurrentTurnPlayer() {
        return this.gameData?.gameState?.currentTurn;
    }
    
    // Get player data
    getPlayer(uid) {
        return this.gameData?.players?.[uid];
    }
    
    // Get all players
    getPlayers() {
        return this.gameData?.players || {};
    }
    
    // Get board state
    getBoard() {
        return this.gameData?.board;
    }
}

