export * from './src/Constants';

// Export all our types.
export interface FoundryManifest {
  download: string;
  languages: FoundryManifestLanguage[];
  // Other properties exist, but just define the ones that we expect to have.
}

export type FoundryManifestLanguage = {
  lang: string;
  name: string;
  path: string;
}

export type TargetLanguage = {
  code: string;
  foundryCode: string;
  name: string;
}
