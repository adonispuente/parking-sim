// Scale simulation time, not rendering/camera time. Bound catch-up after a hidden tab
// and subdivide accelerated frames to preserve the traffic engine's small updates.
export function advancePlayback(simulation, realDelta, speed, rates, lots) {
  const multiplier = Math.max(1, Math.min(30, Number(speed) || 1));
  const elapsed = Number.isFinite(realDelta) ? Math.max(0, Math.min(0.1, realDelta)) : 0;
  const duration = elapsed * multiplier;
  const steps = Math.ceil(duration / 0.05);
  for (let i = 0; i < steps; i++) simulation.step(duration / steps, rates, lots);
}

// UI playback reconstructs private gate/service/shuttle state from its origin.
export const PLAYBACK_SPEEDS = Object.freeze([-30, -20, -10, -5, 5, 10, 20, 30]);
export const PLAYBACK_STEP = .05;
const copy = value => structuredClone(value);
const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 0));

export function createSeekablePlayback(factory, initialInputs = {}, options = {}) {
  const yieldWork = options.yieldWork ?? yieldToUI;
  const chunkSteps = Math.max(1, options.chunkSteps ?? 100);
  let inputs = copy(initialInputs), signature = JSON.stringify(inputs);
  let simulation = factory(), ticks = 0, accumulator = 0;
  let generation = 0, seeking = false;
  // Frames are presentation only, never fed back into engine closures.
  const captureFrame = options.captureFrame;
  const stride = Math.max(1, options.frameStride ?? 5);
  const maxFrames = Math.max(2, options.maxFrames ?? 2400);
  const maxBytes = Math.max(1024, options.maxHistoryBytes ?? 24 * 1024 * 1024);
  let history = [], historyBytes = 0, engineTicks = 0, visibleFrame = null;
  let progress = { seeking: false, target: 0, completed: 0 };
  const record = (state, tick, buffer) => {
    if (!captureFrame || tick % stride) return;
    const value = captureFrame(state), bytes = JSON.stringify(value).length * 2;
    buffer.frames.push({ tick, value: { ...value, lanes: state.lanes }, bytes });
    buffer.bytes += bytes;
    while (buffer.frames.length > 1 && (buffer.frames.length > maxFrames || buffer.bytes > maxBytes))
      buffer.bytes -= buffer.frames.shift().bytes;
  };
  const remember = () => {
    const buffer = { frames: history, bytes: historyBytes };
    record(simulation, ticks, buffer); historyBytes = buffer.bytes;
  };
  const configure = state => {
    state.setPhase?.(inputs.phase ?? 'arrival');
    state.setShuttleConfig?.(inputs.shuttles ?? {});
    state.setZonePreferences?.(inputs.zonePreferences ?? {});
    state.setDeparturePolicy?.(inputs.departurePolicy ?? {});
  };
  configure(simulation);
  remember();
  const step = state => {
    configure(state);
    state.step(PLAYBACK_STEP, inputs.rates ?? [0, 0, 0], inputs.lots ?? []);
  };
  return {
    get simulation() { return visibleFrame ?? simulation; },
    get clock() { return ticks * PLAYBACK_STEP; },
    get seeking() { return seeking; },
    get progress() { return progress; },
    get historyInfo() { return { frames: history.length, bytes: historyBytes, oldest: (history[0]?.tick ?? ticks) * PLAYBACK_STEP }; },
    cancel() { generation++; seeking = false; accumulator = 0; progress = { ...progress, seeking: false }; },
    setInputs(next) {
      const nextSignature = JSON.stringify(next);
      if (nextSignature === signature) return false;
      generation++; seeking = false; accumulator = 0;
      inputs = copy(next); signature = nextSignature;
      simulation = factory(); ticks = 0;
      configure(simulation);
      engineTicks = 0; visibleFrame = null; history = []; historyBytes = 0; remember();
      return true;
    },
    advance(realDelta, speed = 5) {
      if (seeking) return;
      const delta = Number.isFinite(realDelta) ? Math.max(0, Math.min(.1, realDelta)) : 0;
      const multiplier = PLAYBACK_SPEEDS.includes(Number(speed)) ? Number(speed) : 5;
      if(multiplier<0) {
        accumulator+=delta*Math.abs(multiplier);
        const count=Math.floor((accumulator+1e-10)/PLAYBACK_STEP);
        if(!ticks){accumulator=0;return;}
        if(!count)return;
        const target = Math.max(0, ticks - count);
        if (captureFrame && history.length && target >= history[0].tick) {
          let i = history.length - 1;
          while (i > 0 && history[i].tick > target) i--;
          ticks = target; visibleFrame = history[i].value;
          accumulator = ticks ? Math.max(0, accumulator - count * PLAYBACK_STEP) : 0;
          return;
        }
        // Outside the bounded history, reconstruct once and refill the cache.
        const remainder=Math.max(0,accumulator-count*PLAYBACK_STEP);
        return this.seek(target*PLAYBACK_STEP).then(applied=>{
          if(applied&&ticks)accumulator=remainder;
          return applied;
        });
      }
      if (visibleFrame || engineTicks !== ticks) return this.seek(ticks * PLAYBACK_STEP);
      accumulator += delta * multiplier;
      const count = Math.floor((accumulator + 1e-10) / PLAYBACK_STEP);
      for (let i = 0; i < count; i++) { step(simulation); ticks++; engineTicks = ticks; remember(); }
      accumulator = Math.max(0, accumulator - count * PLAYBACK_STEP);
    },
    async seek(seconds, onProgress = () => {}) {
      if (!Number.isFinite(seconds)) throw new TypeError('Seek time must be finite');
      const target = Math.round(Math.max(0, seconds) / PLAYBACK_STEP);
      const version = ++generation;
      seeking = true; accumulator = 0;
      const report = patch => { progress = patch; onProgress(patch); };
      try {
        report({ seeking: true, target: target * PLAYBACK_STEP, completed: 0 });
        await yieldWork();
        if (version !== generation) return false;
        const rebuilt = factory();
        configure(rebuilt);
        const buffer = { frames: [], bytes: 0 };
        if (target < maxFrames * stride) record(rebuilt, 0, buffer);
        for (let tick = 0; tick < target;) {
          const end = Math.min(target, tick + chunkSteps);
          for (; tick < end; tick++) {
            step(rebuilt);
            if (tick + 1 >= target - maxFrames * stride) record(rebuilt, tick + 1, buffer);
          }
          report({ seeking: true, target: target * PLAYBACK_STEP, completed: tick * PLAYBACK_STEP });
          await yieldWork();
          if (version !== generation) return false;
        }
        simulation = rebuilt; ticks = target; engineTicks = target; visibleFrame = null;
        history = buffer.frames; historyBytes = buffer.bytes;
        report({ seeking: false, target: this.clock, completed: this.clock });
        return true;
      } finally {
        if (version === generation) seeking = false;
      }
    },
  };
}