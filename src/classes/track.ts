import { ITrack } from '../../typings/breakdown';
import { setGain } from "./setGain";

export class Track implements ITrack {
  constructor(
    audioContext: AudioContext,
    destinationNode: AudioNode,
    readonly description: string,
    readonly filename: string,
    readonly groupName?: string) {
    this._audioElement = document.createElement("audio");
    this._sourceNode = audioContext.createMediaElementSource(this._audioElement);
    this._gainNodeV = audioContext.createGain();
    this._gainNodeM = audioContext.createGain();
    this._sourceNode.connect(this._gainNodeV).connect(this._gainNodeM).connect(destinationNode);
    this._audioElement.src = this.filename;
    this._audioElement.preload = "auto";
    this.volume("down");
    this.activate();
  }
  private readonly _audioElement: HTMLAudioElement;
  private readonly _sourceNode: MediaElementAudioSourceNode;
  private readonly _gainNodeM: GainNode;
  private readonly _gainNodeV: GainNode;
  set playbackRate(rate: number) { this._audioElement.playbackRate = rate; }
  seek(seconds: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this._audioElement.currentTime = seconds;
      let cancel = setTimeout(() => { reject(this._audioElement.readyState); }, 2500);
      this._audioElement.oncanplaythrough = () => {
        clearTimeout(cancel);
        this._audioElement.oncanplaythrough = null;
        resolve();
      };
    });
  }
  play() { this._audioElement.play(); }
  pause() { this._audioElement.pause(); }
  private _volume?: string;
  isVolume(volume: string): boolean { return this._volume === volume; }
  volume(volume: string, fadeSeconds: number = 0) {
    let value: number;
    this._volume = volume;
    switch (volume) {
      case "down": value = 0.5; break;
      case "up": value = 1; break;
      default: value = 0; break;
    }
    setGain(this._gainNodeV, value, fadeSeconds);
  }
  private _active: boolean = true;
  get active(): boolean { return this._active; }
  activate(groupName?: string) {
    this._active = (!!groupName) ? this.groupName === groupName : true;
    if (this._active)
      setGain(this._gainNodeM, 1, 1.5);
    else
      setGain(this._gainNodeM, 0, 3);
  }
}
