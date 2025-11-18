// Game Constants

const SUITS = {
    HEARTS: 'H',
    SPADES: 'S',
    DIAMONDS: 'D',
    CLUBS: 'C'
};

const SUIT_NAMES = {
    H: 'hearts',
    S: 'spades',
    D: 'diamonds',
    C: 'clubs'
};

const SUIT_SYMBOLS = {
    H: '♥',
    S: '♠',
    D: '♦',
    C: '♣'
};

const SUIT_COLORS = {
    H: 'red',
    D: 'red',
    S: 'black',
    C: 'black'
};

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const RANK_VALUES = {
    'A': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13
};

const RANK_INDICES = {
    'A': 0,
    '2': 1,
    '3': 2,
    '4': 3,
    '5': 4,
    '6': 5,
    '7': 6,
    '8': 7,
    '9': 8,
    '10': 9,
    'J': 10,
    'Q': 11,
    'K': 12
};

// Suit order for sorting
const SUIT_ORDER = {
    H: 0,  // Hearts first
    D: 1,  // Diamonds second
    S: 2,  // Spades third
    C: 3   // Clubs fourth
};

const TURN_TIMEOUT = 30000; // 30 seconds per turn

const ROOM_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

