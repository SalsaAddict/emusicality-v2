export interface IBeatElapsedCallback { (beatsElapsed: number): void; }
export class Clock {
    constructor(
        private readonly _audioContext: AudioContext,
        private readonly _bpm: number,
        private readonly _startOffset: number,
        readonly beatElapsedCallback: IBeatElapsedCallback) {
        this._secondsPerBeat = 60 / this._bpm;
    }
    playbackRate: number = 1;
    private _secondsPerBeat: number;
    private _secondsActual: number = 0;
    get secondsActual() { return this._secondsActual; }
    private _secondsElapsed: number = 0;
    get secondsElapsed() { return this._secondsElapsed; }
    private _beatsElapsed: number = 0;
    get beatsElapsed() { return this._beatsElapsed; }
    set beatsElapsed(b: number) {
        this._beatsElapsed = b;
        this._secondsActual = this._secondsElapsed = b * this._secondsPerBeat + this._startOffset;
    }
    get bpm() { return this._bpm * this.playbackRate; }
    private _frameHandle?: number;
    start(time = this._audioContext.currentTime) {
        this._frameHandle = requestAnimationFrame(() => {
            let elapsed = -time + (time = this._audioContext.currentTime);
            this._secondsActual += elapsed;
            let s = this._secondsElapsed += elapsed * this.playbackRate;
            this._beatsElapsed = (s <= this._startOffset) ? 0 : Math.floor((s - this._startOffset) / this._secondsPerBeat) + 1;
            this.beatElapsedCallback(this._beatsElapsed);
            this.start(time);
        });
    }
    stop() { cancelAnimationFrame(this._frameHandle!); }
}