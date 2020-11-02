import { Track } from './track';
import { ITrack } from '../../typings/breakdown';
import { IAssetFn } from './song';

export class Tracks {
    constructor(
        private readonly _audioContext: AudioContext,
        private readonly _destinationNode: AudioNode,
        private readonly _asset: IAssetFn) { }
    private readonly _tracks: Track[] = [];
    addTrack(track: string | ITrack, groupName?: string): void {
        if (!!groupName && this.groups.indexOf(groupName) < 0) this.groups.push(groupName);
        if (typeof track === "string")
            this._tracks.push(new Track(this._audioContext, this._destinationNode, track, this._asset(`${track.toLowerCase()}.mp3`), groupName));
        else
            this._tracks.push(new Track(this._audioContext, this._destinationNode, track.description, this._asset(track.filename), groupName));
    }
    readonly groups: string[] = [];
    private _filter?: string;
    filter(groupName?: string) {
        this._filter = groupName;
        this._tracks.forEach(track => track.activate(groupName));
    }
    isFilter(groupName?: string) {
        return (!!groupName || !!this._filter) ? groupName === this._filter : true;
    }
    get active(): Track[] {
        return this._tracks.filter(track => track.active);
    }
    set playbackRate(rate: number) {
        this._tracks.forEach(track => track.playbackRate = rate);
    }
    seek(seconds: number): Promise<void[]> {
        let promises: Promise<void>[] = [];
        this._tracks.forEach(track => promises.push(track.seek(seconds)));
        return Promise.all(promises);
    }
    play() { this._tracks.forEach(track => track.play()); }
    pause() { this._tracks.forEach(track => track.pause()); }
}