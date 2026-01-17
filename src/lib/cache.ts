import NodeCache from 'node-cache';

// Create a cache instance. Logs will be kept for 10 minutes.
export const appCache = new NodeCache({ stdTTL: 600 });
