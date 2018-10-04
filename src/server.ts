/*
 * Import NODE Modules
 */
const http = require('http');
const https = require('https');
const debug = require('debug');
const path = require('path');

/**
 * EXPRESS APPLICATION CODE
 */
// import App from './controllers/express.controller';

import { ENVIRONMENT, EXPRESS_SERVER_MODE, PORT } from './util/secrets';

/****
 * Bootstrap Controller
 */
import { bootstrapController } from './controllers/';

/**
 * EXPRESS APPLICATION CONTROLLER
 */
import App from './controllers/express.controller';

/**
 * SERVER containers
 */
let httpServer: any;
const env: string = ENVIRONMENT.toString();

/**
 * Error Handler
 */
function onError(error: NodeJS.ErrnoException): void {
  if (error.syscall !== 'listen') throw error;
  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/****
 * On Listening: called when our express app has inittialzied
 */
function onListening(): void {
  const addr = httpServer.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
  console.error(`Listening on ${bind}`);

  /*****
   * BOOTSTRAP APPLICATION
   */

  bootstrapController.init();
}

/***
 * Create server instance
 */
export const createServer = (): Promise<any> => {
  let err: Error;

  // Create HTTP server.
  if (EXPRESS_SERVER_MODE === 'http') {
    try {
      httpServer = http.createServer(App);
    } catch (e) {
      err = e;
    } finally {
      /**
       * Listen on provided port, on all network interfaces.
       */
      const server = httpServer.listen(PORT);
      httpServer.on('error', onError);
      httpServer.on('listening', onListening);
      return err ? Promise.reject(err) : Promise.resolve(server);
    }
  }
};
