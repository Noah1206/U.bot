import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { useAIStore } from '@/stores/aiStore';

// Agent configuration
interface AgentConfig {
  id: string;
  name: string;
  color: number;
  icon: string;
}

const AGENTS: AgentConfig[] = [
  { id: 'planner', name: 'Planner', color: 0x3b82f6, icon: '🏗️' },
  { id: 'critic', name: 'Critic', color: 0xef4444, icon: '🔍' },
  { id: 'researcher', name: 'Researcher', color: 0x22c55e, icon: '📚' },
];

// Main game scene
class MainScene extends Phaser.Scene {
  private agents: Map<string, {
    sprite: Phaser.GameObjects.Arc;
    glow: Phaser.GameObjects.Arc;
    label: Phaser.GameObjects.Text;
    targetX: number;
    targetY: number;
    config: AgentConfig;
  }> = new Map();
  private connections: Phaser.GameObjects.Graphics | null = null;
  private particles: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();
  private starField: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: 'MainScene' });
  }

  create() {
    const { width, height } = this.scale;

    // Create starfield background
    this.createStarfield(width, height);

    // Create connection graphics layer
    this.connections = this.add.graphics();

    // Create agents
    AGENTS.forEach((config, index) => {
      const angle = (index / AGENTS.length) * Math.PI * 2 - Math.PI / 2;
      const radius = Math.min(width, height) * 0.25;
      const centerX = width / 2;
      const centerY = height / 2;

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      this.createAgent(config, x, y);
    });

    // Start wandering behavior
    this.time.addEvent({
      delay: 3000,
      callback: () => this.updateTargets(),
      loop: true,
    });

    // Initial target update
    this.updateTargets();

    // Simulate data flow periodically
    this.time.addEvent({
      delay: 2000,
      callback: () => this.simulateDataFlow(),
      loop: true,
    });
  }

  createStarfield(width: number, height: number) {
    this.starField = this.add.graphics();
    this.starField.setDepth(-1);

    // Draw stars
    for (let i = 0; i < 200; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.FloatBetween(0.5, 2);
      const alpha = Phaser.Math.FloatBetween(0.2, 0.8);

      this.starField.fillStyle(0xffffff, alpha);
      this.starField.fillCircle(x, y, size);
    }

    // Add some larger, colored stars
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const colors = [0x3b82f6, 0x8b5cf6, 0x06b6d4, 0xec4899];
      const color = colors[Phaser.Math.Between(0, colors.length - 1)];

      this.starField.fillStyle(color, 0.4);
      this.starField.fillCircle(x, y, 2);
    }
  }

  createAgent(config: AgentConfig, x: number, y: number) {
    // Glow effect
    const glow = this.add.circle(x, y, 30, config.color, 0.2);
    glow.setDepth(0);

    // Pulse animation for glow
    this.tweens.add({
      targets: glow,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.1,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Main sprite (circle for now - can be replaced with pixel art)
    const sprite = this.add.circle(x, y, 20, config.color, 1);
    sprite.setDepth(1);
    sprite.setStrokeStyle(2, 0xffffff, 0.5);

    // Make interactive
    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerover', () => {
      this.tweens.add({
        targets: sprite,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 200,
      });
    });
    sprite.on('pointerout', () => {
      this.tweens.add({
        targets: sprite,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
      });
    });
    sprite.on('pointerdown', () => {
      console.log(`Clicked agent: ${config.name}`);
      // Could dispatch event to React here
    });

    // Label
    const label = this.add.text(x, y + 35, config.name, {
      fontSize: '12px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    });
    label.setOrigin(0.5);
    label.setDepth(2);

    this.agents.set(config.id, {
      sprite,
      glow,
      label,
      targetX: x,
      targetY: y,
      config,
    });
  }

  updateTargets() {
    const { width, height } = this.scale;
    const padding = 100;

    this.agents.forEach((agent) => {
      agent.targetX = Phaser.Math.Between(padding, width - padding);
      agent.targetY = Phaser.Math.Between(padding, height - padding);
    });
  }

  update() {
    // Move agents toward targets
    this.agents.forEach((agent) => {
      const dx = agent.targetX - agent.sprite.x;
      const dy = agent.targetY - agent.sprite.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        const speed = 0.5;
        agent.sprite.x += dx * speed * 0.02;
        agent.sprite.y += dy * speed * 0.02;
        agent.glow.x = agent.sprite.x;
        agent.glow.y = agent.sprite.y;
        agent.label.x = agent.sprite.x;
        agent.label.y = agent.sprite.y + 35;
      }
    });

    // Update connections
    this.drawConnections();
  }

  drawConnections() {
    if (!this.connections) return;

    this.connections.clear();
    this.connections.setDepth(0);

    const agentArray = Array.from(this.agents.values());

    // Draw lines between all agents
    for (let i = 0; i < agentArray.length; i++) {
      for (let j = i + 1; j < agentArray.length; j++) {
        const a1 = agentArray[i];
        const a2 = agentArray[j];

        const distance = Phaser.Math.Distance.Between(
          a1.sprite.x,
          a1.sprite.y,
          a2.sprite.x,
          a2.sprite.y
        );

        // Fade line based on distance
        const maxDistance = 400;
        const alpha = Math.max(0, 1 - distance / maxDistance) * 0.3;

        if (alpha > 0.05) {
          this.connections.lineStyle(1, 0x3b82f6, alpha);
          this.connections.lineBetween(
            a1.sprite.x,
            a1.sprite.y,
            a2.sprite.x,
            a2.sprite.y
          );
        }
      }
    }
  }

  simulateDataFlow() {
    const agentArray = Array.from(this.agents.values());
    if (agentArray.length < 2) return;

    // Pick random pair
    const from = agentArray[Phaser.Math.Between(0, agentArray.length - 1)];
    let to = agentArray[Phaser.Math.Between(0, agentArray.length - 1)];
    while (to === from) {
      to = agentArray[Phaser.Math.Between(0, agentArray.length - 1)];
    }

    // Create particle flow effect
    this.createDataFlowParticles(from, to);
  }

  createDataFlowParticles(
    from: { sprite: Phaser.GameObjects.Arc; config: AgentConfig },
    to: { sprite: Phaser.GameObjects.Arc; config: AgentConfig }
  ) {
    const emitter = this.add.particles(from.sprite.x, from.sprite.y, undefined, {
      speed: 200,
      scale: { start: 0.4, end: 0 },
      blendMode: 'ADD',
      lifespan: 1000,
      quantity: 1,
      frequency: 50,
      tint: from.config.color,
    });

    // Move particles toward target
    this.tweens.add({
      targets: emitter,
      x: to.sprite.x,
      y: to.sprite.y,
      duration: 1000,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        emitter.stop();
        this.time.delayedCall(500, () => {
          emitter.destroy();
        });
      },
    });

    // Draw temporary bright connection line
    const graphics = this.add.graphics();
    graphics.lineStyle(2, from.config.color, 0.8);
    graphics.lineBetween(from.sprite.x, from.sprite.y, to.sprite.x, to.sprite.y);

    this.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 1000,
      onComplete: () => graphics.destroy(),
    });
  }
}

export function PhaserGame() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Get container dimensions
    const { width, height } = containerRef.current.getBoundingClientRect();

    // Create Phaser game
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: width,
      height: height,
      parent: containerRef.current,
      backgroundColor: '#0a0a0f',
      scene: MainScene,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        pixelArt: true,
        antialias: false,
      },
    };

    gameRef.current = new Phaser.Game(config);

    // Cleanup
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '400px' }}
    />
  );
}
