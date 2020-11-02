import { Measure } from './measure';

export class Section {
  constructor(
    readonly description: string,
    readonly startIndex: number,
    readonly isFirst: boolean,
    readonly isLast: boolean,
    readonly previous?: number,
    readonly next?: number) {
  }
  get endIndex(): number { return this.measures.length ? this.measures[this.measures.length - 1].endIndex : 0; }
  readonly measures: Measure[] = [];
  isForBeatIndex(beatIndex: number): boolean { return beatIndex >= this.startIndex && beatIndex <= this.endIndex; }
}