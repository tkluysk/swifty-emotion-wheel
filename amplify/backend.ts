import { defineBackend } from '@aws-amplify/backend';
import { FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import { spotifyMetadata } from './functions/spotify-metadata/resource';

const backend = defineBackend({
  spotifyMetadata,
});

const spotifyMetadataUrl = backend.spotifyMetadata.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [],
  },
});

backend.addOutput({
  custom: {
    spotifyMetadataUrl: spotifyMetadataUrl.url,
  },
});
