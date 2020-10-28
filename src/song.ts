import { ICatalog, ISong } from '../typings/catalog';
import { IBreakdown, ITrack, ITrackGroup } from '../typings/breakdown';
import { HttpClient } from '@angular/common/http';

export class Song implements ISong {
  static load(http: HttpClient, context: AudioContext, songId: string) {
    return new Promise<Song>((resolve, reject) => {
      let path: string = "assets/songs/";
      http.get<ICatalog>(`${path}catalog.json`)
        .subscribe((catalog) => {
          path = `${path}${songId}/`;
          http.get<IBreakdown>(`${path}breakdown.json`)
            .subscribe((breakdown) => {
              let song = new Song(
                context,
                path,
                songId,
                catalog.songs[songId].title,
                catalog.songs[songId].artist,
                catalog.songs[songId].genre,
                catalog.songs[songId].bpm,
                breakdown.startOffset || 0
              );
                  breakdown.tracks.forEach((track: string | ITrack | ITrackGroup) => {
                if (typeof track !== "string") {
                  if (track.description && track.filename)
                    song.addTrack(track as ITrack);
                  else
                    Object.keys(track as ITrackGroup).forEach((groupName: string) => {
                      (track as ITrackGroup)[groupName].forEach(item => song.addTrack(item, groupName));
                    });
                }
                else song.addTrack(track);
              });
              resolve(song);
            });
        });
    });
  }
  constructor(
    private readonly _audioContext: AudioContext,
    private readonly _path: string,
    readonly songId: string,
    readonly title: string,
    readonly artist: string,
    readonly genre: string,
    readonly bpm: number,
    readonly startOffset: number) { }
  private _resume(): Promise<void> {
    switch (this._audioContext.state) {
      case "running": return Promise.resolve();
      case "suspended": return this._audioContext.resume();
      default: return Promise.reject(this._audioContext.state);
    }
  }
  private _suspend(): Promise<void> {
    switch (this._audioContext.state) {
      case "suspended": return Promise.resolve();
      case "running": return this._audioContext.suspend();
      default: return Promise.reject(this._audioContext.state);
    }
  }
  asset(fileName: string): string { return `${this._path}${fileName}`; }
  readonly groups: string[] = [];
  private _group: string = "";
  activeGroup(group: string = ""): boolean { return this._group === group; }
  filter(group: string = ""): void {
    this._group = group;
    this._tracks.forEach((track) => {
      track.volume(this.tracks.indexOf(track) >= 0 ? "down" : "off", 2);
    });
  }
  private readonly _tracks: Track[] = [];
  addTrack(track: string | ITrack, groupName?: string): void {
    if (groupName && this.groups.indexOf(groupName!) < 0) this.groups.push(groupName!);
    if (typeof track === "string")
      this._tracks.push(new Track(this._audioContext, track, this.asset(`${track.toLowerCase()}.mp3`), groupName));
    else
      this._tracks.push(new Track(this._audioContext, track.description, this.asset(track.filename), groupName));
  }
  get tracks(): Track[] {
    return this._group ? this._tracks.filter(track => track.groupName === this._group) : this._tracks;
  }
  private _playing: boolean = false;
  get playing(): boolean { return this._playing; }
  play(seconds: number = 0): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._resume().then(() => {
        let promises: Promise<void>[] = [];
        this._tracks.forEach(track => promises.push(track.seek(seconds)));
        Promise.all(promises).then(() => {
          promises = [];
          this._tracks.forEach(track => promises.push(track.play()));
          Promise.all(promises).then(() => {
            this._playing = true;
            resolve();
          }).catch(reason => reject(reason));
        }).catch(reason => reject(reason));
      }).catch(reason => reject(reason));
    });
  }
  pause(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.tracks.forEach(track => track.pause());
      this._suspend().then(() => {
        this._playing = false;
        resolve();
      }).catch(reason => reject(reason));;
    })
  }
}
export class Track implements ITrack {
  constructor(
    private readonly _audioContext: AudioContext,
    readonly description: string,
    readonly filename: string,
    readonly groupName?: string) {
    this._audioElement = document.createElement("audio");
    this._sourceNode = _audioContext.createMediaElementSource(this._audioElement);
    this._gainNode = _audioContext.createGain();
    this._sourceNode.connect(this._gainNode).connect(_audioContext.destination);
    this._audioElement.src = this.filename;
    this._audioElement.preload = "auto";
    this.volume("down");
  }
  private readonly _audioElement: HTMLAudioElement;
  private readonly _sourceNode: MediaElementAudioSourceNode;
  private readonly _gainNode: GainNode;
  seek(seconds: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this._audioElement.currentTime = seconds;
      let cancel = setTimeout(() => { reject(this._audioElement.readyState); }, 2500);
      this._audioElement.oncanplaythrough = () => { clearTimeout(cancel); resolve(); }
    });
  }
  play(): Promise<void> { return this._audioElement.play(); }
  pause(): void { this._audioElement.pause(); }
  private _volume?: string;
  volume(volume: string, seconds: number = 1): void {
    let value: number;
    this._volume = volume;
    switch (volume) {
      case "down": value = 0.5; break;
      case "up": value = 1; break;
      default: value = 0; break;
    }
    if (this._audioContext.state !== "running")
      this._gainNode.gain.value = value;
    else
      this._gainNode.gain.linearRampToValueAtTime(value, this._audioContext.currentTime + seconds);
  }
  isVolume(volume: string): boolean { return this._volume === volume; }
}