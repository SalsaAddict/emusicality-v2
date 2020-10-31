import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Song } from '../../classes/song';
import { Section } from 'src/classes/section';
import { Measure } from 'src/classes/measure';
import { setGain } from '../../classes/setGain';

@Component({
  selector: 'app-breakdown',
  templateUrl: './breakdown.component.html',
  styles: [
  ]
})
export class BreakdownComponent implements OnInit {
  constructor(private route: ActivatedRoute, private http: HttpClient) {
    this._audioContext = new AudioContext();
    this._gainNode = this._audioContext.createGain();
    this._gainNode.connect(this._audioContext.destination);
    Song.load(http, this._audioContext, this._gainNode, this.route.snapshot.params['songId']).then(song => this.song = song);
  }
  song?: Song; section?: Section; measure?: Measure;
  ngOnInit(): void { }

  private _audioContext: AudioContext;
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

  private _gainNode: GainNode;

  private _busy: boolean = false;
  get busy(): boolean { return this._busy; }

  private _playing: boolean = false;
  get playing(): boolean { return this._playing; }

  readonly playbackRates: string[] = ["slow", "normal", "fast"];
  private _playbackRate: string = "normal";
  isPlaybackRate(rate: string) { return rate === this._playbackRate; }
  playbackRate(rate: string) {
    switch (this._playbackRate = rate) {
      case "fast": this.song!.playbackRate = 1.1; break;
      case "slow": this.song!.playbackRate = 0.9; break;
      default: this.song!.playbackRate = 1; break;
    }
  }

  private _seconds: number = 0;
  get seconds(): number { return this._seconds; }
  set seconds(s: number) {
    this._seconds = s;
    this._beatIndex = this._seconds <= this.song!.startOffset ? 0 : Math.floor((this._seconds - this.song!.startOffset) / this.song!.secondsPerBeat) + 1;
    this._synchronise();
  }

  private _beatIndex: number = 0;
  get beatIndex(): number { return this._beatIndex; }
  set beatIndex(i: number) {
    this._beatIndex = i;
    this._seconds = i <= 1 ? 0 : (i * this.song!.secondsPerBeat) + this.song!.startOffset;
    this._synchronise();
  }

  private _synchronise(): void {
    if (!(this.section && this.section!.isForBeatIndex(this._beatIndex))) {
      delete this.section;
      for (let i = 0; i < this.song!.sections.length; i++) {
        if (this.song!.sections[i].isForBeatIndex(this._beatIndex)) {
          this.section = this.song!.sections[i];
          break;
        }
      }
    }
    if (!(this.section && this.measure && this.measure!.isForBeatIndex(this._beatIndex))) {
      delete this.measure;
      if (this.section) {
        for (let i = 0; i < this.section!.measures.length; i++) {
          if (this.section!.measures[i].isForBeatIndex(this._beatIndex)) {
            this.measure = this.section!.measures[i];
            break;
          }
        }
      }
    }
  }

  get beat(): number | undefined { return this.measure ? this._beatIndex - this.measure!.startIndex + 1 : undefined; }

  measureClass(measure: Measure, isLast: boolean): string {
    let active: boolean = measure === this.measure!,
      icon: string = !active ? "fa-circle-o" : measure.timingChange ? "fa-exclamation-circle" : measure.splitPhrase ? "fa-pause-circle" : "fa-circle",
      context: string = measure.timingChange ? "text-danger" : measure.splitPhrase ? "text-warning" : "text-info",
      animation: string = active ? "animate__animated animate__faster animate__heartBeat" : "",
      margin: string = measure.splitPhrase && !isLast ? "mr-2" : "";
    return `fa fa-fw fa-lg ${icon} ${context} ${animation} ${margin}`.replace(/\s+/g, " ");
  }

  private _frameHandle?: number;
  private _startAnimation(time: number = this._audioContext.currentTime): void {
    this._frameHandle = requestAnimationFrame(() => {
      this.seconds += (-time + (time = this._audioContext.currentTime)) * this.song!.playbackRate;
      this._startAnimation(time);
    });
  }
  private _stopAnimation(): void { cancelAnimationFrame(this._frameHandle!); }

  seek(): Promise<void[]> {
    let promises: Promise<void>[] = [];
    this.song!.tracks.forEach(track => promises.push(track.seek(this.seconds)));
    return Promise.all(promises);
  }

  play() {
    this._busy = true;
    setGain(this._gainNode, 0, 0);
    this._resume().then(() => {
      this.seek().then(() => {
        this._startAnimation();
        this.song!.tracks.forEach(track => track.play());
        setGain(this._gainNode, 1, 0.25);
        this._playing = true;
        this._busy = false;
      });
    });
  }

  pause() {
    this._busy = true;
    setGain(this._gainNode, 0, 0.5);
    setTimeout(() => {
      this.song!.tracks.forEach(track => track.pause());
      this._stopAnimation();
      this._suspend().then(() => {
        this._playing = false;
        this._busy = false;
      });
    }, 600);
  }

  next(): void {
    let playing: boolean = this.playing;
    setGain(this._gainNode, 0, 0);
    if (playing) {
      this._stopAnimation();
      this.song!.tracks.forEach(track => track.pause());
    }
    this.beatIndex = this.section ? this.section!.endIndex + 1 : 0;
    this.seek().then(() => { if (playing) this.play(); });
  }
}
