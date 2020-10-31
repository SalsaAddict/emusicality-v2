export function setGain(gainNode: GainNode, value: number, fadeSeconds: number) {
  if (fadeSeconds === 0 || gainNode.context.state !== "running") gainNode.gain.value = value;
  else gainNode.gain.linearRampToValueAtTime(value, gainNode.context.currentTime + fadeSeconds);
}
