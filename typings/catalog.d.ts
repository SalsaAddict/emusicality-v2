export interface ICatalog {
  $schema: "../schemas/catalog.json";
  songs: { [id: string]: ISong };
}

export interface ISong {
  title: string;
  artist: string;
  genre: string;
  bpm: number;
}