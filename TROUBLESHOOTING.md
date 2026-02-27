# AI Life Layer - 트러블슈팅 가이드

## 해결된 이슈들

### 1. AI 우주선 자동 Wandering 기능

#### 문제
- AI 우주선들이 사용자가 명령을 입력해야만 움직임
- 자율적인 탐험 동작이 없음

#### 원인
- `startAIInteractions()`가 `sendCommand()` 호출 시에만 실행됨
- Phaser Container에 대한 Tween이 제대로 작동하지 않음

#### 해결 방법

**1. MainScene.ts에 wandering 시스템 추가**

```typescript
// 클래스 속성 추가
private agentTargets: Map<string, { x: number; y: number; speed: number }> = new Map();
private frameCount: number = 0;

// create() 메서드에서 자동 시작
create(): void {
  // ... 기존 코드 ...
  this.startAgentWandering();
}

// 새로운 메서드들
private startAgentWandering(): void {
  const agentArray = Array.from(this.agents.values());
  agentArray.forEach((agent) => {
    this.setNewWanderTarget(agent);
  });
}

private setNewWanderTarget(agent: Agent): void {
  const width = this.scale.width;
  const height = this.scale.height;
  const minX = 350;
  const maxX = width - 80;
  const minY = 80;
  const maxY = height - 100;

  const targetX = Phaser.Math.Between(minX, maxX);
  const targetY = Phaser.Math.Between(minY, maxY);
  const speed = Phaser.Math.FloatBetween(1.5, 3.5);

  this.agentTargets.set(agent.config.id, { x: targetX, y: targetY, speed });
}

private updateAgentWandering(): void {
  this.agents.forEach((agent) => {
    if (agent.isSelected) return;

    let target = this.agentTargets.get(agent.config.id);
    if (!target) {
      this.setNewWanderTarget(agent);
      target = this.agentTargets.get(agent.config.id);
      if (!target) return;
    }

    const dx = target.x - agent.x;
    const dy = target.y - agent.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 15) {
      this.setNewWanderTarget(agent);
      return;
    }

    const moveX = (dx / distance) * target.speed;
    const moveY = (dy / distance) * target.speed;
    agent.setPosition(agent.x + moveX, agent.y + moveY);
  });
}

// update() 메서드에서 호출
update(): void {
  this.updateAgentWandering();
  // ... 기존 코드 ...
}
```

**2. Agent.ts의 update() 메서드 간소화**

기존 이동 로직이 wandering과 충돌하지 않도록 수정:

```typescript
update(): void {
  // 시각적 효과만 처리 (이동은 MainScene에서 담당)
  if (this._isSelected) {
    this.selectionRing.rotation += 0.005;
  }

  const pulse = 0.8 + Math.sin(Date.now() * 0.003) * 0.2;
  this.glowEffect.setAlpha(pulse);

  if (this.currentStatus === 'idle') {
    this.sprite.y = Math.sin(Date.now() * 0.002) * 2;
  }
}
```

---

### 2. Tauri 앱 bundle.js 404 에러

#### 문제
- Tauri WebView에서 `bundle.js` 파일을 찾지 못함
- 브라우저에서는 정상 작동하지만 Tauri 앱에서만 에러 발생

#### 원인
- `index.html`이 `/dist/bundle.js`를 참조하지만 파일이 존재하지 않음
- Vite dev 서버는 `/src/main.ts`를 직접 처리하지만, 정적 파일 요청은 실제 파일 필요

#### 해결 방법

**1. bundle.js 파일 생성**

```bash
npx esbuild src/main.ts --bundle --outfile=dist/bundle.js --format=esm --platform=browser
```

**2. index.html 수정**

```html
<script type="module" src="/dist/bundle.js"></script>
```

---

### 3. Vite/Tauri 포트 불일치

#### 문제
- Vite가 포트 3000에서 실행되고, Tauri는 포트 5173을 기대함
- "Waiting for your frontend dev server to start on http://localhost:5173" 메시지

#### 해결 방법

**1. vite.config.ts 수정**

```typescript
server: {
  port: 5173,
  strictPort: true,  // 포트가 사용 중이면 에러 발생
  // ... 기타 설정
}
```

**2. tauri.conf.json 수정**

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build:bundle",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  }
}
```

---

## 개발 환경 실행 방법

### 1. 백엔드 서버 시작
```bash
cd backend
python3 server.py
```

### 2. 프론트엔드 (Tauri 앱) 시작
```bash
cd frontend
npm run tauri dev
```

### 3. 브라우저에서 테스트 (선택사항)
```bash
# Vite dev 서버만 실행
npm run dev
# 브라우저에서 http://localhost:5173 접속
```

---

## 주요 포트

| 서비스 | 포트 | 설명 |
|--------|------|------|
| Vite Dev Server | 5173 | 프론트엔드 개발 서버 |
| Backend API | 8000 | FastAPI WebSocket 서버 |

---

## 파일 구조

```
desiger/
├── backend/
│   └── server.py          # FastAPI WebSocket 서버
├── frontend/
│   ├── src/
│   │   ├── main.ts         # 앱 진입점
│   │   ├── scenes/
│   │   │   ├── MainScene.ts  # 메인 게임 씬 (wandering 로직)
│   │   │   ├── UIScene.ts    # UI 씬
│   │   │   └── BootScene.ts  # 부팅/로딩 씬
│   │   └── entities/
│   │       └── Agent.ts      # AI 우주선 엔티티
│   ├── dist/
│   │   └── bundle.js        # 빌드된 번들 파일
│   ├── src-tauri/
│   │   └── tauri.conf.json  # Tauri 설정
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── docs/
    └── TROUBLESHOOTING.md   # 이 문서
```
