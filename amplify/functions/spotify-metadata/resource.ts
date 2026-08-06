import { defineFunction, secret } from '@aws-amplify/backend';

export const spotifyMetadata = defineFunction({
  name: 'spotify-metadata',
  entry: './handler.ts',
  environment: {
    SPOTIFY_CLIENT_ID: secret('SPOTIFY_CLIENT_ID'),
    SPOTIFY_CLIENT_SECRET: secret('SPOTIFY_CLIENT_SECRET'),
  },
  timeoutSeconds: 10,
});
