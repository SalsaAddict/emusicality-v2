import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Song } from '../../song';

@Component({
  selector: 'app-breakdown',
  templateUrl: './breakdown.component.html',
  styles: [
  ]
})
export class BreakdownComponent implements OnInit {
  constructor(private route: ActivatedRoute, private http: HttpClient) {
    Song.load(http, this._audioContext, this.route.snapshot.params['songId']).then(song => this.song = song);
  }
  ngOnInit(): void { }
  private _audioContext: AudioContext = new AudioContext();
  song?: Song;

  private _busy: boolean = false;
  get busy(): boolean { return this._busy; }

  private _seconds: number = 0;
  get seconds(): number { return this._seconds; }

  private _beats: number = 0;
  get beats(): number { return this._beats; }

  private _frameHandle?: number;
  private _startAnimation(time: number = this._audioContext.currentTime): void {
    this._frameHandle = requestAnimationFrame(() => {
      this._seconds += time = (this._audioContext.currentTime - time);
      this._beats = this._seconds <= this.song!.startOffset ? 0 : Math.floor((this._seconds - this.song!.startOffset) / (60 / this.song!.bpm)) + 1;
      this._startAnimation(this._audioContext.currentTime);
    });
  }
  private _stopAnimation(): void { cancelAnimationFrame(this._frameHandle!); }

  play(): void {
    this._busy = true;
    this.song?.play(this._seconds).then(() => {
      this._startAnimation();
      this._busy = false;
    });
  }

  pause(): void {
    this._busy = true;
    this.song?.pause().then(() => {
      this._stopAnimation();
      this._busy = false;
    });
  }

  public get playing(): boolean { return this.song?.playing || false; }
}
