# AI Life Layer

<p align="center">
  <img src="docs/banner.png" alt="AI Life Layer" width="600">
</p>

<p align="center">
  <strong>Production-Hardened AI Orchestration System</strong>
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#usage">Usage</a> •
  <a href="#development">Development</a>
</p>

---

## Installation

### One-Line Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/Noah1206/U.bot/main/scripts/install.sh | bash
```

### Homebrew (macOS)

```bash
brew tap Noah1206/U.bot
brew install ai-life-layer
```

### Manual Download

Download the latest release for your platform:

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | [ai-life-layer_vX.X.X_aarch64.dmg](https://github.com/Noah1206/U.bot/releases/latest) |
| macOS (Intel) | [ai-life-layer_vX.X.X_x64.dmg](https://github.com/Noah1206/U.bot/releases/latest) |
| Linux (x64) | [ai-life-layer_vX.X.X_amd64.AppImage](https://github.com/Noah1206/U.bot/releases/latest) |
| Windows (x64) | [ai-life-layer_vX.X.X_x64-setup.exe](https://github.com/Noah1206/U.bot/releases/latest) |

### Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/Noah1206/U.bot/main/scripts/install.sh | bash -s uninstall
```

---

## Features

### 🎮 Dual View System
- **Game View**: Phaser.js pixel-art visualization of AI agents
- **Chat View**: Clean interface for AI interaction

### 🧠 Production-Hardened AI Architecture
- **Blind Evaluation**: Prevents LLM gaming by hiding numeric scores
- **Stability Tracking**: Auto-terminates at 85% stability
- **Round System**: Architect (Round 1) → Refiner (Round 2+)
- **Multiple Termination Conditions**: Stability, max rounds, goal divergence

### 🔌 Multi-Provider Support
- OpenAI (GPT-4o, GPT-4, etc.)
- Anthropic Claude (Opus, Sonnet, Haiku)
- Google Gemini (Pro, Ultra)
- Ollama (Local models)

---

## Architecture

```
Round 1: ARCHITECT
├── Planner creates structure
└── Structure gets LOCKED

Round 2+: REFINER
├── Structure cannot change
└── Only details are refined

Termination Conditions:
├── stability > 0.85 (converged)
├── round >= 3 (hard limit)
├── contradiction_trend UP (degrading)
├── vs_goal == "farther" x2 (wrong direction)
└── missing_count == 0 (complete)
```

### Stability Index Formula

```
stability = (1 - contradiction_ratio) * 0.30 +
            decision_reuse_rate * 0.25 +
            plan_similarity * 0.25 +
            goal_convergence * 0.20
```

---

## Usage

### Start the App

```bash
# macOS
open "/Applications/AI Life Layer.app"

# Linux
ai-life-layer

# Or run from terminal
ai-life-layer
```

### Commands

In the app's command input:

```bash
# Start AI orchestration
/orchestrate Create a REST API for user management

# Short form
/o Design a web scraper in Python

# Regular chat
Hello, how can you help me?
```

### Configuration

1. Click ⚙️ Settings
2. Enter your API keys
3. Select default provider
4. Adjust stability threshold if needed

---

## Development

### Prerequisites

- Node.js 20+
- Rust 1.70+
- Python 3.11+ (for backend)

### Setup

```bash
# Clone
git clone https://github.com/Noah1206/U.bot.git
cd ai-life-layer

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
pip install -r requirements.txt
cd ..
```

### Run Development

```bash
# Terminal 1: Backend server
cd backend
python server.py

# Terminal 2: Tauri dev (frontend + desktop)
npm run tauri dev

# Or web-only
npm run dev
```

### Build

```bash
# Build for production
npm run tauri build
```

### Project Structure

```
ai-life-layer/
├── src/                    # React Frontend
│   ├── components/         # UI Components
│   ├── stores/             # Zustand state
│   ├── services/ai/        # AI orchestration
│   └── services/api/       # WebSocket client
├── src-tauri/              # Tauri (Rust)
├── backend/                # Python FastAPI
│   ├── providers/          # AI providers
│   └── server.py           # WebSocket server
└── scripts/                # Installation scripts
```

---

## License

MIT © [Your Name]

---

<p align="center">
  Made with ❤️ for AI enthusiasts
</p>
