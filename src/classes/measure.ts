import { IMeasure } from 'typings/breakdown';

export class Measure implements IMeasure {
  constructor(
    readonly startIndex: number,
    readonly beats: number,
    readonly framework?: string,
    readonly splitPhrase: boolean = false,
    readonly timingChange: boolean = false) {
    this.endIndex = this.startIndex + this.beats - 1;
    for (let i = 0; i < this.beats; i++)this.ticks.push(i + 1);
  }
  readonly endIndex: number;
  isForBeatIndex(beatIndex: number): boolean { return beatIndex >= this.startIndex && beatIndex <= this.endIndex; }
  readonly ticks: number[] = [];
}