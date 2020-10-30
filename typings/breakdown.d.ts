export interface IBreakdown {
  $schema: "../../schemas/breakdown.json";
  startOffset?: number;
  beatsPerMeasure: number;
  tracks: (string | ITrack | ITrackGroup)[];
  sections: ISection[];
}

export interface ITrackGroup {
  [groupName: string]: (string | ITrack)[];
}

export interface ITrack {
  description: string;
  filename: string;
}

export interface ISection {
  description: string;
  framework?: string;
  measures: number | (number | string | IMeasure)[];
}

export interface IMeasure {
  beats?: number;
  framework?: string;
  splitPhrase?: boolean;
}