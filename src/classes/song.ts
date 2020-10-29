import { ICatalog, ISong } from '../../typings/catalog';
import { IBreakdown, ITrack, ITrackGroup, ISection, IMeasure } from '../../typings/breakdown';
import { HttpClient } from '@angular/common/http';
import { Track } from './track';
import { Section } from './section';
import { Measure } from './measure';

export class Song implements ISong {
  static load(http: HttpClient, audioContext: AudioContext, destinationNode: AudioNode, songId: string) {
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
                breakdown.startOffset || 0,
                breakdown.beatsPerMeasure
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
              let currentIndex: number = 1, measure: Measure;
              breakdown.sections.forEach((s: ISection) => {
                let section = new Section(s.description, currentIndex),
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
    private readonly _audioContext: AudioContext,
    private readonly _destinationNode: AudioNode,
    private readonly _path: string,
    readonly songId: string,
    readonly title: string,
    readonly artist: string,
    readonly genre: string,
    readonly bpm: number,
    readonly startOffset: number,
    readonly beatsPerMeasure: number) { }
  asset(fileName: string): string { return `${this._path}${fileName}`; }
  readonly groups: string[] = [];
  private _group: string = "";
  activeGroup(group: string = ""): boolean { return this._group === group; }
  filter(group: string = ""): void {
    this._group = group;
    this._tracks.forEach((track) => this.tracks.indexOf(track) >= 0 ? track.unmute() : track.mute());
  }
  private readonly _tracks: Track[] = [];
  addTrack(track: string | ITrack, groupName?: string): void {
    if (groupName && this.groups.indexOf(groupName!) < 0) this.groups.push(groupName!);
    if (typeof track === "string")
      this._tracks.push(new Track(this._audioContext, this._destinationNode, track, this.asset(`${track.toLowerCase()}.mp3`), groupName));
    else
      this._tracks.push(new Track(this._audioContext, this._destinationNode, track.description, this.asset(track.filename), groupName));
  }
  get tracks(): Track[] {
    return this._group ? this._tracks.filter(track => track.groupName === this._group) : this._tracks;
  }

  sections: Section[] = [];

  private _playing: boolean = false;
  get playing(): boolean { return this._playing; }
  play(seconds: number = 0): Promise<void> {
    return new Promise<void>((resolve, reject) => {
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
    });
  }
  pause(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.tracks.forEach(track => track.pause());
      this._playing = false;
      resolve();
    })
  }
}
