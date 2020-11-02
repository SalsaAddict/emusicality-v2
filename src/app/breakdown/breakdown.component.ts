import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Song } from '../../classes/song';
import { Section } from 'src/classes/section';
import { Measure } from 'src/classes/measure';
import { setGain } from '../../classes/setGain';
import { IBeatElapsedCallback } from 'src/classes/clock';

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
    Song.load(http, this._audioContext, this._gainNode, this.route.snapshot.params['songId'], this._synchronise)
      .then((song) => { this.song = song; this._synchronise(0); });
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
  get playbackRate() { return this._playbackRate; }
  isPlaybackRate(rate: string) { return rate === this._playbackRate; }
  setPlaybackRate(rate: string) {
    let n: number;
    switch (this._playbackRate = rate) {
      case "fast": n = 1.1; break;
      case "slow": n = 0.9; break;
      default: n = 1; break;
    }
    this.song!.playbackRate = n;
  }

  private _synchronise: IBeatElapsedCallback = (beatsElapsed: number) => {
    if (!beatsElapsed) {
      this.section = this.song!.sections[0];
      this.measure = this.section!.measures[0];
      return;
    }
    if (!(this.section && this.section!.isForBeatIndex(beatsElapsed))) {
      delete this.section;
      for (let i = 0; i < this.song!.sections.length; i++) {
        if (this.song!.sections[i].isForBeatIndex(beatsElapsed)) {
          this.section = this.song!.sections[i];
          break;
        }
      }
    }
    if (!(this.section && this.measure && this.measure!.isForBeatIndex(beatsElapsed))) {
      delete this.measure;
      if (this.section) {
        for (let i = 0; i < this.section!.measures.length; i++) {
          if (this.section!.measures[i].isForBeatIndex(beatsElapsed)) {
            this.measure = this.section!.measures[i];
            break;
          }
        }
      }
    }
  }

  get beat(): number | undefined { return this.measure ? this.song!.clock.beatsElapsed - this.measure!.startIndex + 1 : undefined; }

  measureClass(measure: Measure, isLast: boolean): string {
    let active: boolean = measure === this.measure!,
      icon: string = !active ? "fa-circle-o" : (measure.timingChange || measure.splitPhrase) ? "fa-exclamation-circle" : "fa-circle",
      context: string = measure.timingChange ? "text-danger" : measure.splitPhrase ? "text-warning" : "text-info",
      animation: string = active ? "animate__animated animate__faster animate__heartBeat" : "",
      margin: string = measure.splitPhrase && !isLast ? "mr-2" : "";
    return `fa fa-fw fa-lg ${icon} ${context} ${animation} ${margin}`.replace(/\s+/g, " ");
  }

  seek() { return this.song!.tracks.seek(this.song!.clock.secondsElapsed); }

  play() {
    this._busy = true;
    setGain(this._gainNode, 0, 0);
    this._resume().then(() => {
      this.seek().then(() => {
        this.song!.clock.start();
        this.song!.tracks.play();
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
      this.song!.tracks.pause();
      this.song!.clock.stop();
      this._suspend().then(() => {
        this._playing = false;
        this._busy = false;
      });
    }, 600);
  }

  goToBeat(beat: number) {
    let playing: boolean = this.playing;
    setGain(this._gainNode, 0, 0);
    if (playing) {
      this.song!.clock.stop();
      this.song!.tracks.pause();
    }
    this._synchronise(this.song!.clock.beatsElapsed = beat);
    return this.seek().then(() => { if (playing) this.play(); });
  }

  first() { this.goToBeat(0); }

  previous() {
    if (this.song!.clock.beatsElapsed >= this.section!.startIndex + this.song!.beatsPerMeasure)
      this.goToBeat(this.section!.startIndex);
    else if (!this.section!.isFirst)
      this.goToBeat(this.song!.sections[this.section!.previous!].startIndex);
  }

  next() {
    if (!this.section!.isLast)
      this.goToBeat(this.song!.sections[this.section!.next!].startIndex);
  }

}
