import confetti from 'canvas-confetti';

export function celebrateMilestone() {
  // Burst from the center
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#FFA726', '#FF7043', '#FFCA28', '#66BB6A', '#42A5F5'],
  });
}

export function celebrateSave() {
  // Subtle celebration for saving
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#66BB6A', '#81C784', '#A5D6A7'],
    ticks: 100,
    gravity: 1.2,
  });
}

export function celebrateLevelUp() {
  // Big celebration for level up
  const duration = 2000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#FFA726', '#FF7043', '#FFCA28'],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#66BB6A', '#42A5F5', '#AB47BC'],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}

export function celebrateFirstIdea() {
  // Special celebration for first idea
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    colors: ['#FFA726', '#FFB74D', '#FFCA28'],
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}
