# AI Multiverse Shell - Data Flow Design

## 1. 메시지 스키마

### 1.1 기본 메시지 구조

```typescript
interface Message {
  id: string;              // UUID v4
  timestamp: string;       // ISO-8601

  // 발신자 정보
  source: {
    type: 'agent' | 'user' | 'system';
    id: string;
    name: string;
  };

  // 메시지 유형
  messageType: MessageType;

  // 본문
  content: {
    text?: string;
    data?: Record<string, any>;
    attachments?: Attachment[];
  };

  // 메타데이터
  metadata: {
    priority: 1 | 2 | 3 | 4 | 5;  // 1=highest
    tags: string[];
    parentId?: string;           // 연결된 이전 메시지
    threadId?: string;           // 대화 스레드
  };

  // 상태
  status: 'pending' | 'processing' | 'completed' | 'error';
}

type MessageType =
  | 'command'      // 유저 명령
  | 'plan'         // Planner 출력
  | 'critique'     // Critic 출력
  | 'research'     // Researcher 출력
  | 'feedback'     // 유저 피드백
  | 'status'       // 상태 업데이트
  | 'error';       // 오류
```

### 1.2 에이전트별 메시지 타입

```typescript
// Planner 출력
interface PlanMessage extends Message {
  messageType: 'plan';
  content: {
    title: string;
    objectives: string[];
    steps: {
      id: string;
      description: string;
      assignee?: string;
      dependencies?: string[];
    }[];
    timeline?: string;
    risks?: string[];
  };
}

// Critic 출력
interface CritiqueMessage extends Message {
  messageType: 'critique';
  content: {
    targetMessageId: string;
    verdict: 'approved' | 'needs_revision' | 'rejected';
    issues: {
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      suggestion?: string;
    }[];
    strengths?: string[];
    overallScore?: number;  // 1-10
  };
}

// Researcher 출력
interface ResearchMessage extends Message {
  messageType: 'research';
  content: {
    query: string;
    findings: {
      title: string;
      summary: string;
      source?: string;
      relevance: number;  // 0-1
    }[];
    synthesis?: string;
    recommendations?: string[];
  };
}

// 유저 피드백
interface FeedbackMessage extends Message {
  messageType: 'feedback';
  content: {
    targetMessageId?: string;
    targetAgentId?: string;
    feedbackType: 'approval' | 'correction' | 'direction' | 'question';
    text: string;
    priority?: number;
  };
}
```

---

## 2. 이벤트 시스템

### 2.1 이벤트 구조

```typescript
interface Event {
  eventId: string;
  eventType: string;
  timestamp: string;
  source: string;
  payload: any;
}

// 이벤트 타입 정의
const EVENT_TYPES = {
  // 메시지 관련
  MESSAGE_CREATED: 'message.created',
  MESSAGE_UPDATED: 'message.updated',
  MESSAGE_DELETED: 'message.deleted',

  // 에이전트 관련
  AGENT_STARTED: 'agent.started',
  AGENT_STOPPED: 'agent.stopped',
  AGENT_STATUS_CHANGED: 'agent.status_changed',
  AGENT_ERROR: 'agent.error',

  // 유저 관련
  USER_COMMAND: 'user.command',
  USER_FEEDBACK: 'user.feedback',

  // 시스템 관련
  SYSTEM_READY: 'system.ready',
  SYSTEM_ERROR: 'system.error',
} as const;
```

### 2.2 구독 매트릭스

```
┌─────────────┬──────────────────────────────────────────────────┐
│   Agent     │                 Subscribes To                    │
├─────────────┼──────────────────────────────────────────────────┤
│ Planner     │ user.command, user.feedback,                     │
│             │ message.created (critique), research.completed   │
├─────────────┼──────────────────────────────────────────────────┤
│ Critic      │ message.created (plan),                          │
│             │ user.feedback (when about critique)              │
├─────────────┼──────────────────────────────────────────────────┤
│ Researcher  │ message.created (plan - needs research),         │
│             │ user.command (research request)                  │
├─────────────┼──────────────────────────────────────────────────┤
│ UI          │ ALL message.*, agent.status_changed,             │
│             │ system.*                                         │
└─────────────┴──────────────────────────────────────────────────┘
```

---

## 3. 상태 관리

### 3.1 글로벌 상태

```typescript
interface GlobalState {
  // 시스템 상태
  system: {
    status: 'initializing' | 'ready' | 'running' | 'paused' | 'error';
    startTime: string;
    config: SystemConfig;
  };

  // 에이전트 상태
  agents: Record<string, AgentState>;

  // 현재 작업
  currentTask: {
    id: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed';
    progress: number;  // 0-100
  } | null;

  // 메시지 히스토리 (최근 N개)
  recentMessages: Message[];

  // UI 상태
  ui: {
    selectedAgentId: string | null;
    isPanelOpen: boolean;
    playbackSpeed: number;
  };
}

interface AgentState {
  id: string;
  type: 'planner' | 'critic' | 'researcher' | 'custom';
  name: string;
  status: 'idle' | 'thinking' | 'acting' | 'waiting' | 'error';
  lastActivity: string;
  currentTask?: string;

  // 시각화용
  position: { x: number; y: number };
  animation: string;
}
```

### 3.2 상태 변경 흐름

```
User Action ──► Dispatcher ──► State Update ──► UI Render
                    │
                    ▼
              Event Publish ──► Agent Handlers ──► New Messages
                                      │
                                      ▼
                              State Update ──► UI Render
```

---

## 4. 데이터 흐름 시퀀스

### 4.1 기본 작업 흐름

```
┌──────┐     ┌───────────┐     ┌─────────┐     ┌────────┐     ┌──────────┐
│ User │     │ Dispatcher│     │ Planner │     │ Critic │     │Researcher│
└──┬───┘     └─────┬─────┘     └────┬────┘     └───┬────┘     └────┬─────┘
   │               │                │              │               │
   │  command      │                │              │               │
   │──────────────►│                │              │               │
   │               │                │              │               │
   │               │  dispatch      │              │               │
   │               │───────────────►│              │               │
   │               │                │              │               │
   │               │                │  publish     │               │
   │               │                │  plan        │               │
   │               │◄───────────────│──────────────│               │
   │               │                │              │               │
   │               │  notify        │              │               │
   │               │───────────────────────────────►│              │
   │               │                │              │               │
   │               │                │              │  critique     │
   │               │◄──────────────────────────────│               │
   │               │                │              │               │
   │               │  dispatch      │              │               │
   │               │───────────────►│              │               │
   │               │                │              │               │
   │               │                │  updated     │               │
   │               │                │  plan        │               │
   │◄──────────────│◄───────────────│              │               │
   │               │                │              │               │
```

### 4.2 피드백 처리 흐름

```
User Feedback
      │
      ▼
┌─────────────────┐
│ Feedback Router │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌───────┐
│Target │  │Global │
│Agent  │  │All    │
└───┬───┘  └───┬───┘
    │          │
    ▼          ▼
Process     Broadcast
Feedback    to All
    │          │
    └────┬─────┘
         │
         ▼
   Update State
         │
         ▼
   Publish Event
         │
         ▼
   UI Update
```

---

## 5. 캐싱 전략

### 5.1 캐시 레이어

```
┌─────────────────────────────────────────────────────────────┐
│                      CACHE LAYERS                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  L1: Memory Cache (Hot Data)                                │
│  ├── Recent messages (last 100)                             │
│  ├── Agent states                                           │
│  └── UI state                                                │
│                                                              │
│  L2: Redis/In-Memory DB (Warm Data)                         │
│  ├── Message history (last 1000)                            │
│  ├── Session state                                           │
│  └── Computed results                                        │
│                                                              │
│  L3: Persistent Storage (Cold Data)                         │
│  ├── All message history                                     │
│  ├── Configuration                                           │
│  └── Analytics data                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 캐시 무효화

```typescript
// 캐시 무효화 규칙
const CACHE_INVALIDATION = {
  // 메시지 생성 시 → 최근 메시지 캐시 업데이트
  'message.created': ['recentMessages'],

  // 에이전트 상태 변경 시 → 에이전트 캐시 업데이트
  'agent.status_changed': ['agents'],

  // 설정 변경 시 → 전체 캐시 무효화
  'system.config_changed': ['*'],
};
```

---

## 6. 에러 핸들링

### 6.1 에러 타입

```typescript
enum ErrorType {
  // 에이전트 에러
  AGENT_TIMEOUT = 'AGENT_TIMEOUT',
  AGENT_CRASH = 'AGENT_CRASH',
  AGENT_INVALID_OUTPUT = 'AGENT_INVALID_OUTPUT',

  // 통신 에러
  MESSAGE_DELIVERY_FAILED = 'MESSAGE_DELIVERY_FAILED',
  EVENT_PUBLISH_FAILED = 'EVENT_PUBLISH_FAILED',

  // AI 프로바이더 에러
  AI_API_ERROR = 'AI_API_ERROR',
  AI_RATE_LIMIT = 'AI_RATE_LIMIT',
  AI_QUOTA_EXCEEDED = 'AI_QUOTA_EXCEEDED',

  // 시스템 에러
  STATE_CORRUPTION = 'STATE_CORRUPTION',
  STORAGE_ERROR = 'STORAGE_ERROR',
}

interface ErrorEvent {
  errorType: ErrorType;
  message: string;
  source: string;
  timestamp: string;
  context?: Record<string, any>;
  recoverable: boolean;
  suggestedAction?: string;
}
```

### 6.2 에러 복구 전략

```
┌──────────────────────┬──────────────────────────────────────┐
│     Error Type       │          Recovery Strategy           │
├──────────────────────┼──────────────────────────────────────┤
│ AGENT_TIMEOUT        │ Retry with increased timeout         │
│                      │ → Fallback to simpler prompt         │
│                      │ → Mark as failed, notify user        │
├──────────────────────┼──────────────────────────────────────┤
│ AI_RATE_LIMIT        │ Exponential backoff                  │
│                      │ → Queue pending requests             │
│                      │ → Switch to backup provider          │
├──────────────────────┼──────────────────────────────────────┤
│ MESSAGE_DELIVERY     │ Retry 3 times                        │
│                      │ → Store in dead letter queue         │
│                      │ → Alert system                       │
├──────────────────────┼──────────────────────────────────────┤
│ STATE_CORRUPTION     │ Restore from last checkpoint         │
│                      │ → Rebuild from event log             │
│                      │ → Full system restart                │
└──────────────────────┴──────────────────────────────────────┘
```

---

## 7. 시각화 데이터

### 7.1 애니메이션 이벤트

```typescript
interface VisualEvent {
  type: 'data_transfer' | 'status_change' | 'highlight' | 'effect';
  source: string;
  target?: string;
  animation: {
    name: string;
    duration: number;  // ms
    easing: string;
  };
  visual: {
    icon?: string;      // 📋, 🔍, ⚠️ 등
    color?: string;
    particle?: string;  // 파티클 효과
  };
}

// 예시: Planner → Critic 데이터 전송
{
  type: 'data_transfer',
  source: 'planner-001',
  target: 'critic-001',
  animation: {
    name: 'beam_transfer',
    duration: 500,
    easing: 'ease-out'
  },
  visual: {
    icon: '📋',
    color: '#4A90D9',
    particle: 'sparkle'
  }
}
```

### 7.2 캐릭터 상태 매핑

```typescript
const CHARACTER_ANIMATIONS: Record<AgentStatus, Animation> = {
  idle: {
    frames: ['idle_1', 'idle_2'],
    duration: 1000,
    loop: true
  },
  thinking: {
    frames: ['think_1', 'think_2', 'think_3'],
    duration: 500,
    loop: true,
    effect: 'thought_bubble'
  },
  acting: {
    frames: ['act_1', 'act_2', 'act_3', 'act_4'],
    duration: 300,
    loop: true,
    effect: 'action_lines'
  },
  waiting: {
    frames: ['wait_1', 'wait_2'],
    duration: 800,
    loop: true,
    effect: 'dots'
  },
  error: {
    frames: ['error_1'],
    duration: 0,
    loop: false,
    effect: 'error_shake'
  }
};
```

---

## 8. 성능 최적화

### 8.1 메시지 배치 처리

```typescript
// 대량 메시지 처리 시 배치 적용
const MESSAGE_BATCH_CONFIG = {
  batchSize: 10,           // 한 번에 처리할 메시지 수
  batchInterval: 100,      // 배치 간격 (ms)
  maxQueueSize: 1000,      // 최대 대기열 크기
};

// 우선순위 기반 처리
const PRIORITY_WEIGHTS = {
  1: 5,   // Critical - 즉시 처리
  2: 3,   // High - 빠른 처리
  3: 2,   // Medium - 일반 처리
  4: 1,   // Low - 지연 가능
  5: 0.5, // Background - 유휴 시 처리
};
```

### 8.2 UI 렌더링 최적화

```
┌─────────────────────────────────────────────────────────────┐
│                   RENDERING PIPELINE                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. State Change Detection                                   │
│     └── Dirty flag check                                    │
│                                                              │
│  2. Diff Calculation                                         │
│     └── Compare previous vs current state                   │
│                                                              │
│  3. Batch Updates                                            │
│     └── Group multiple changes                              │
│                                                              │
│  4. Priority Rendering                                       │
│     └── Critical UI first, decorative later                 │
│                                                              │
│  5. Frame Budget                                             │
│     └── Target: 60fps (16.67ms per frame)                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

*Document Version: 0.1.0*
*Last Updated: 2024*
