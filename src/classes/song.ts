import { ICatalog, ISong } from '../../typings/catalog';
import { IBreakdown, ITrack, ITrackGroup, ISection, IMeasure } from '../../typings/breakdown';
import { HttpClient } from '@angular/common/http';
import { Track } from './track';
import { Section } from './section';
import { Measure } from './measure';
import { Clock, IBeatElapsedCallback } from './clock';
import { Tracks } from './tracks';

export interface IAssetFn { (fileName: string): string; }
export class Song {
  static load(
    http: HttpClient,
    audioContext: AudioContext,
    destinationNode: AudioNode,
    songId: string,
    beatElapsedCallback: IBeatElapsedCallback) {
    return new Promise<Song>((resolve, reject) => {
      let path: string = "assets/songs/";
      http.get<ICatalog>(`${path}catalog.json`)
        .subscribe((catalog) => {
          path = `${path}${songId}/`;
          http.get<IBreakdown>(`${path}breakdown.json`)
            .subscribe((breakdown) => {
              let song = new Song(
                audioContext,
                destinationNode,
                path,
                songId,
                catalog.songs[songId].title,
                catalog.songs[songId].artist,
                catalog.songs[songId].genre,
                catalog.songs[songId].bpm,
                breakdown.startOffset ?? 0,
                breakdown.beatsPerMeasure,
                beatElapsedCallback);
              breakdown.tracks.forEach((track: string | ITrack | ITrackGroup) => {
                if (typeof track !== "string") {
                  if (track.description && track.filename)
                    song.tracks.addTrack(track as ITrack);
                  else
                    Object.keys(track as ITrackGroup).forEach((groupName: string) => {
                      (track as ITrackGroup)[groupName].forEach(item => song.tracks.addTrack(item, groupName));
                    });
                }
                else song.tracks.addTrack(track);
              });
              let currentIndex: number = 1, measure: Measure;
              breakdown.sections.forEach((s, sIndex, sArray) => {
                let isFirst = sIndex === 0,
                  isLast = sIndex === sArray.length - 1,
                  previous = (!isFirst) ? sIndex - 1 : undefined,
                  next = (!isLast) ? sIndex + 1 : undefined,
                  section = new Section(s.description, currentIndex, isFirst, isLast, previous, next),
                  framework: string | undefined = s.framework;
                if (typeof s.measures === "number") {
                  for (let i = 1; i <= s.measures; i++) {
                    measure = new Measure(currentIndex, song.beatsPerMeasure, framework, false);
                    currentIndex += measure.beats;
                    section.measures.push(measure);
                  }
                }
                else s.measures.forEach((m) => {
                  if (typeof m === "string") {
                    framework = m!;
                    measure = new Measure(currentIndex, song.beatsPerMeasure, framework, false, false);
                  }
                  else if (typeof m === "number") {
                    let beats: number = m > 0 ? m : song.beatsPerMeasure;
                    measure = new Measure(currentIndex, beats, framework, m < 0, beats != song.beatsPerMeasure);
                  }
                  else {
                    let beats: number = (m.beats || 0) > 0 ? m.beats! : song.beatsPerMeasure,
                      splitAfter: boolean = m.splitPhrase || false;
                    framework = m.framework ? m.framework : framework;
                    measure = new Measure(currentIndex, beats, framework, splitAfter, beats != song.beatsPerMeasure)
                  }
                  currentIndex += measure.beats;
                  section.measures.push(measure);
                });
                song.sections.push(section);
              });
              resolve(song);
            });
        });
    });
  }
  constructor(
    _audioContext: AudioContext,
    _destinationNode: AudioNode,
    private readonly _path: string,
    readonly songId: string,
    readonly title: string,
    readonly artist: string,
    readonly genre: string,
    bpm: number,
    startOffset: number,
    readonly beatsPerMeasure: number,
    beatElapsedCallback: IBeatElapsedCallback) {
    this.clock = new Clock(_audioContext, bpm, startOffset, beatElapsedCallback);
    this.tracks = new Tracks(_audioContext, _destinationNode, this.asset);
  }
  readonly asset: IAssetFn = (fileName: string) => { return `${this._path}${fileName}`; }
  get playbackRate() { return this.clock.playbackRate; }
  set playbackRate(rate: number) { this.clock.playbackRate = this.tracks.playbackRate = rate; }
  readonly clock: Clock;
  readonly tracks: Tracks;
  readonly sections: Section[] = [];
}
