import { ITrack } from '../../typings/breakdown';

export class Track implements ITrack {
  constructor(
    private readonly _audioContext: AudioContext,
    private readonly _destinationNode: AudioNode,
    readonly description: string,
    readonly filename: string,
    readonly groupName?: string) {
    this._audioElement = document.createElement("audio");
    this._sourceNode = _audioContext.createMediaElementSource(this._audioElement);
    this._gainNodeV = _audioContext.createGain();
    this._gainNodeM = _audioContext.createGain();
    this._sourceNode.connect(this._gainNodeV).connect(this._gainNodeM).connect(this._destinationNode);
    this._audioElement.src = this.filename;
    this._audioElement.preload = "auto";
    this.volume("down");
    this.unmute();
  }
  private readonly _audioElement: HTMLAudioElement;
  private readonly _sourceNode: MediaElementAudioSourceNode;
  private readonly _gainNodeM: GainNode;
  private readonly _gainNodeV: GainNode;
  seek(seconds: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this._audioElement.currentTime = seconds;
      let cancel = setTimeout(() => { reject(this._audioElement.readyState); }, 2500);
      this._audioElement.oncanplaythrough = () => { clearTimeout(cancel); resolve(); };
    });
  }
  play(): Promise<void> { return this._audioElement.play(); }
  pause(): void { this._audioElement.pause(); }
  private _volume?: string;
  private _setGain(_gainNode: GainNode, gain: number, delay: number = 2): void {
    if (this._audioContext.state !== "running")
      _gainNode.gain.value = gain;

    else
      _gainNode.gain.linearRampToValueAtTime(gain, this._audioContext.currentTime + delay);
  }
  volume(volume: string, seconds: number = 1): void {
    let value: number;
    this._volume = volume;
    switch (volume) {
      case "down": value = 0.5; break;
      case "up": value = 1; break;
      default: value = 0; break;
    }
    this._setGain(this._gainNodeV, value);
  }
  isVolume(volume: string): boolean { return this._volume === volume; }
  mute(): void { this._setGain(this._gainNodeM, 0); }
  unmute(): void { this._setGain(this._gainNodeM, 1); }
}
