// Scale simulation time, not rendering/camera time. Bound catch-up after a hidden tab
// and subdivide accelerated frames to preserve the traffic engine's small updates.
export function advancePlayback(simulation, realDelta, speed, rates, lots) {
  const multiplier = Math.max(1, Math.min(20, Number(speed) || 1));
  const elapsed = Number.isFinite(realDelta) ? Math.max(0, Math.min(0.1, realDelta)) : 0;
  const duration = elapsed * multiplier;
  const steps = Math.ceil(duration / 0.05);
  for (let i = 0; i < steps; i++) simulation.step(duration / steps, rates, lots);
}