import { environmentService } from '../services';

const isString = (str: string): boolean => {
  return !str || (str && typeof str === 'string');
};

/****
 * Load environment files from env directory
 * to use different path: loadEnvironmentalVariables('./mydirname')
 */
environmentService.loadEnvironmentalVariables();

/***
 * Development Environment
 */
export const ENVIRONMENT = process.env['ENVIRONMENT'];
process.env.NODE_ENV = ENVIRONMENT || 'dev';

/***
 * Express server instance runs either in http or https
 */
export const EXPRESS_SERVER_MODE = process.env['EXPRESS_SERVER_MODE'];

console.log(EXPRESS_SERVER_MODE);

/***
 * Express Server Port Number
 */
export const PORT = process.env['PORT'];

/***
 * Conversion Rates
 */
export const CSV_SOURCE_DIRECTORY = process.env['CSV_SOURCE_DIRECTORY'];
export const CSV_SOURCE_FILE = process.env['CSV_SOURCE_FILE'];
export const ONLINE_XML_SOURCE = process.env['ONLINE_XML_SOURCE'];

/***
 * Data Refresh Rates
 */
export const ECB_DATA_REFRESH_RATE = parseInt(process.env['ECB_DATA_REFRESH_RATE']);

/***
 * Checks before bootstrapping application
 */
if (!EXPRESS_SERVER_MODE) {
  console.error(
    'Express Server mode is either http or https. Please pick your mode! Well, actually only http is supported in this version.',
  );
  process.exit(1);
}

const dir: string = CSV_SOURCE_DIRECTORY;
const file: string = CSV_SOURCE_FILE;
if (!dir || !isString(dir) || !file || !isString(file)) {
  console.error('Critical error: Conversion Rates environment settings are not configured.');
  process.exit(1);
}
