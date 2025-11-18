# Badaam Saat (Sevens) - Multiplayer Card Game

A real-time multiplayer implementation of the classic card game Badaam Saat (also known as Sevens), built with HTML, CSS, JavaScript, and Firebase.

## 🎮 Game Features

### Core Features
- **2-4 Player Support**: Flexible player count with automatic card distribution
- **Real-time Multiplayer**: Instant updates using Firebase Realtime Database
- **Session Rooms**: Play multiple games with cumulative scoring
- **Single Game Mode**: Quick one-off games
- **Mobile Responsive**: Works perfectly on desktop, tablet, and mobile devices

### Game Mechanics
- **Authentic Rules**: 7♥ starts the game, sequences build from 7s
- **Auto-Sorted Hands**: Cards automatically sorted by suit and rank
- **Valid Move Highlighting**: Playable cards are highlighted
- **Turn-Based Play**: Clear turn indicators and player status
- **Scoring System**: Points based on remaining cards (lower is better)

### Session Room Features
- **Multiple Games**: Play unlimited games in the same room
- **Cumulative Scoring**: Track total points across all games
- **Session Leaderboard**: Real-time standings within your room
- **Game History**: Review past games and scores
- **Target Score**: Set a losing threshold (optional)
- **Max Games Limit**: Set session length (optional)
- **Late Join**: Allow players to join mid-session (optional)

### Leaderboards
- **Daily Leaderboard**: Today's top players
- **Weekly Leaderboard**: This week's champions
- **All-Time Leaderboard**: Career statistics

### Player Options
- **Email/Password Authentication**: Permanent accounts with stats
- **Guest Mode**: Play anonymously without registration
- **Public Rooms**: Browse and join open games
- **Private Rooms**: 6-character room codes for friends

## 🚀 Quick Start

### Prerequisites
- A Firebase account (free tier works perfectly)
- A web browser
- (Optional) A code editor for customization

### Setup Instructions

#### 1. Firebase Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add Project"
   - Name your project (e.g., "badaam-saat-game")
   - Disable Google Analytics (optional)
   - Click "Create Project"

2. **Enable Authentication**
   - In Firebase Console, go to "Authentication"
   - Click "Get Started"
   - Enable "Email/Password" sign-in method
   - Enable "Anonymous" sign-in method

3. **Create Realtime Database**
   - Go to "Realtime Database" in Firebase Console
   - Click "Create Database"
   - Choose location closest to your users
   - Start in "Test Mode" (we'll add security rules later)
   - Click "Enable"

4. **Get Firebase Configuration**
   - Go to Project Settings (gear icon)
   - Scroll down to "Your apps"
   - Click the web icon (</>)
   - Register your app with a nickname
   - Copy the firebaseConfig object

#### 2. Configure the Game

1. **Update Firebase Configuration**
   - Open `js/config/firebase-config.js`
   - Replace the placeholder values with your Firebase config:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
       databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT_ID.appspot.com",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```

2. **Deploy Security Rules**
   - In Firebase Console, go to "Realtime Database"
   - Click "Rules" tab
   - Copy the contents of `firebase-rules.json`
   - Paste into the rules editor
   - Click "Publish"

#### 3. Deploy the Game

**Option A: GitHub Pages (Free)**

1. Create a new repository on GitHub
2. Push this code to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```
3. Go to repository Settings → Pages
4. Select "main" branch as source
5. Click "Save"
6. Your game will be live at `https://yourusername.github.io/repository-name/`

**Option B: Local Testing**

1. Use a local web server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   
   # Node.js (if you have http-server installed)
   npx http-server -p 8000
   ```
2. Open `http://localhost:8000` in your browser

**Option C: Firebase Hosting (Free)**

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Login to Firebase:
   ```bash
   firebase login
   ```
3. Initialize hosting:
   ```bash
   firebase init hosting
   ```
   - Select your project
   - Use current directory as public directory: "."
   - Configure as single-page app: No
   - Don't overwrite existing files
4. Deploy:
   ```bash
   firebase deploy --only hosting
   ```

## 📖 How to Play

### Game Rules

1. **Starting the Game**
   - The player with 7♥ must play it first
   - This card starts the game

2. **Playing Cards**
   - Cards must be played in sequence from 7s
   - Each suit builds in two directions:
     - Upward: 7 → 8 → 9 → 10 → J → Q → K
     - Downward: 7 → 6 → 5 → 4 → 3 → 2 → A
   - To open a new suit, play its 7

3. **Turn Order**
   - Players take turns clockwise
   - On your turn, play one card or pass
   - You can only pass if you have no playable cards

4. **Winning**
   - First player to empty their hand wins!
   - Other players score points based on remaining cards:
     - Ace = 1 point
     - 2-10 = Face value
     - Jack = 11 points
     - Queen = 12 points
     - King = 13 points
   - Lower score is better!

### Strategy Tips

- **Strong Cards**: Hold 6s and 8s to control sequences
- **Weak Cards**: Play Aces and Kings early
- **Sevens**: Use strategically to open suits you have cards in
- **Blocking**: Keep cards that prevent opponents from completing sequences
- **Flexibility**: Maintain options in multiple suits

For detailed strategy, see `BADAAM_SAAT_STRATEGY.md`

## 🎯 Game Modes

### Single Game
- Play one game and room closes
- Perfect for quick matches
- No stat tracking within room

### Session Room
- Play multiple games with same group
- Cumulative scoring across games
- Session leaderboard
- Game history
- Optional target score and game limits

## 🏆 Features Breakdown

### Player Flexibility
| Players | Cards Each | Notes |
|---------|------------|-------|
| 2 | 26 | Full deck |
| 3 | 17 | Remove 1 card (random or host choice) |
| 4 | 13 | Full deck |

### Authentication
- ✅ Email/Password registration
- ✅ Anonymous guest play
- ✅ Password reset
- ✅ Persistent sessions

### Room Management
- ✅ Create private/public rooms
- ✅ 6-character room codes
- ✅ Room discovery
- ✅ Active rooms list
- ✅ Auto-cleanup (24h inactive)

### Gameplay
- ✅ Real-time turn-based play
- ✅ Valid move detection
- ✅ Card sorting (suit and rank)
- ✅ Visual feedback
- ✅ Pass functionality
- ✅ Disconnect handling

### Statistics
- ✅ Games played
- ✅ Games won
- ✅ Win rate
- ✅ Average score
- ✅ Total points
- ✅ Current/longest streak

## 💻 Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Firebase Realtime Database
- **Authentication**: Firebase Auth
- **Hosting**: GitHub Pages (or Firebase Hosting)
- **Cost**: $0 (completely free on Firebase free tier)

## 📊 Firebase Free Tier Capacity

The free tier supports:
- ~100 concurrent players
- ~1,000 games per day
- ~30,000 games per month
- 10GB bandwidth/month
- 1GB database storage

## 🛠️ Project Structure

```
badaam-saat/
├── index.html              # Landing/Lobby page
├── game.html               # Game interface
├── css/
│   ├── styles.css          # Main styles
│   ├── game.css            # Game-specific styles
│   └── mobile.css          # Mobile responsive
├── js/
│   ├── config/
│   │   └── firebase-config.js
│   ├── auth/
│   │   └── auth.js
│   ├── game/
│   │   ├── card-logic.js   # Game rules
│   │   ├── game-state.js   # State management
│   │   ├── game-engine.js  # Core logic
│   │   └── game-ui.js      # UI rendering
│   ├── lobby/
│   │   ├── room-manager.js # Room operations
│   │   └── lobby-ui.js     # Lobby UI
│   └── utils/
│       ├── constants.js    # Game constants
│       └── helpers.js      # Utility functions
├── firebase-rules.json     # Security rules
├── BADAAM_SAAT_STRATEGY.md # Strategy guide
└── README.md               # This file
```

## 🔒 Security

- Hands are only visible to their owner (until game ends)
- Only current turn player can make moves
- Host-only operations protected
- Room codes provide privacy
- All data secured with Firebase rules

## 🐛 Troubleshooting

### Cards not showing/Game not loading
- Check browser console for errors
- Verify Firebase configuration is correct
- Ensure Firebase services are enabled
- Check internet connection

### Can't create/join rooms
- Verify authentication is working
- Check Firebase database rules are deployed
- Ensure database is in correct region

### Real-time updates not working
- Check Firebase Realtime Database is enabled
- Verify database URL in config
- Check browser compatibility

## 📝 License

This project is open source and available for personal and educational use.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## 📧 Support

For issues or questions:
1. Check the strategy guide: `BADAAM_SAAT_STRATEGY.md`
2. Review Firebase documentation
3. Check browser console for errors

## 🎉 Credits

Badaam Saat (Sevens) is a classic card game enjoyed worldwide. This implementation brings the traditional game to the digital age with modern web technologies.

---

**Enjoy the game! May the best strategist win! 🃏**

