<div align="center">

# 🎯 Bingo25

**Where Strategy Meets Luck**

A real-time multiplayer 1–25 Bingo game. Create a game, share the code with a friend, and compete to see who gets BINGO first!

[Live Demo](https://bingo25-eight.vercel.app) · [Report Bug](https://github.com/mahender-reddy85/bingo25/issues)

</div>

---

## ✨ Features

- 🎮 **Real-time Multiplayer** — Play with a friend using a 4-digit game code
- 🔀 **Customizable Grid** — Swap numbers to arrange your board before the game starts
- 🏆 **Multiple Game Modes** — Normal, Best of 3, Best of 5
- 🎨 **Dark & Light Themes** — Toggle between themes with a single click
- 🎉 **Confetti Celebrations** — Win animations with particle effects
- 📱 **Fully Responsive** — Works on desktop, tablet, and mobile
- ⚡ **Turn-Based Gameplay** — Players take turns calling numbers
- 🔒 **Server-Validated Wins** — BINGO declarations are verified server-side

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Tailwind CSS |
| **Build Tool** | Vite |
| **Backend** | Vercel Serverless Functions |
| **Database** | Upstash Redis |
| **Hosting** | Vercel |

## 📁 Project Structure

```
bingo/
├── api/                        # Vercel Serverless Functions
│   ├── create-game.ts          # POST /api/create-game
│   ├── join-game.ts            # POST /api/join-game
│   └── game/
│       └── [gameCode].ts       # GET/POST /api/game/:code
├── src/                        # Frontend application code
│   ├── components/
│   │   ├── BingoGrid.tsx       # 5×5 interactive bingo grid
│   │   ├── GameScreen.tsx      # Main game UI with scoreboard
│   │   ├── Modals.tsx          # Rules, Round Won, Game Over modals
│   │   ├── Confetti.tsx        # Canvas-based confetti animation
│   │   └── Icons.tsx           # SVG icon components
│   ├── services/
│   │   └── gameService.ts      # API client with polling for real-time sync
│   ├── utils/
│   │   └── index.ts            # Game constants, seeds & seeded shuffle
│   ├── App.tsx                 # Root component with lobby & routing
│   ├── index.tsx               # React entry point
│   └── types.ts                # TypeScript types & enums
├── public/
│   └── index.css               # Global styles, themes, animations
├── index.html                  # HTML entry point
├── vite.config.ts              # Vite configuration
├── vercel.json                 # Vercel rewrites for API routes
└── .env.local                  # Environment variables (not committed)
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- An [Upstash Redis](https://upstash.com/) database (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/mahender-reddy85/bingo25.git
cd bingo25
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```env
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

> Get these from [Upstash Console](https://console.upstash.com/) → Create Database → REST API section.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🌐 Deploy to Vercel

1. Push your code to GitHub
2. Import the repo on [Vercel](https://vercel.com/new)
3. Add environment variables in Vercel → Project Settings → Environment Variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy — Vercel auto-detects Vite and serverless functions

## 🎮 How to Play

1. **Create a Game** — Pick a mode (Normal / Best of 3 / Best of 5) and create a game
2. **Share the Code** — Send the 4-digit code to your friend
3. **Customize Your Grid** — Click two numbers to swap their positions
4. **Ready Up** — Click "I'm Ready" to lock your grid
5. **Take Turns** — Click an unmarked number on your grid to call it for both players
6. **Get BINGO** — Complete 5 lines (rows, columns, or diagonals) and hit the BINGO button!

## 📄 License

This project is open source and available for personal use.

---

<div align="center">
Made with ❤️ by <a href="https://github.com/mahender-reddy85">Mahender Reddy</a>
</div>
