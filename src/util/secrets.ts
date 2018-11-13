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
export const STORE_SOURCE_DIRECTORY = process.env['STORE_SOURCE_DIRECTORY'];
export const CSV_SOURCE_FILE = process.env['CSV_SOURCE_FILE'];
export const ONLINE_XML_SOURCE = process.env['ONLINE_XML_SOURCE'];
export const ONLINE_XML_LAST_90_DAYS = process.env["ONLINE_XML_LAST_90_DAYS"];

/***
 * Generic Load Settings
 */
export const MY_TIME_ZONE = process.env['MY_TIME_ZONE'];
export const ECB_TIME_ZONE = process.env['ECB_TIME_ZONE'];
export const DATE_FORMAT = process.env['DATE_FORMAT'];
export const RELOAD_RANGE = parseInt(process.env['RELOAD_RANGE']);
export const RELOAD_HOURS = parseInt(process.env['RELOAD_HOURS']);
export const RELOAD_MINUTES = parseInt(process.env['RELOAD_MINUTES']);

/***
 * Mail Settings
 */

 export const MAIL = {
    APPLICATION_NAME: process.env["APPLICATION_NAME"],
    SYSTEM_ADMIN_EMAIL: process.env["SYSTEM_ADMIN_EMAIL"],
    MAIL_SERVICE: process.env['MAIL_SERVICE'],
    SMTP_HOST_URL: process.env["SMTP_HOST_URL"],
    SMTP_PORT:  parseInt( process.env["SMTP_PORT"] ),
    SMTP_AUTH_USER:  process.env["SMTP_AUTH_USER"],
    SMTP_AUTH_PASSWORD:  process.env["SMTP_AUTH_PASSWORD"],
    MAILER_DEFAULT_FROM_ADDRESS:  process.env["MAILER_DEFAULT_FROM_ADDRESS"],
    MAILER_DEFAULT_SENDER_ADDRESS:  process.env["MAILER_DEFAULT_SENDER_ADDRESS"],
    SMTP_SECURE:  process.env["SMTP_SECURE"] == "boolean",
    SMTP_IGNORE_TLS:  process.env["SMTP_IGNORE_TLS"] == "boolean",
    SMTP_REQUIRE_TLS: process.env["SMTP_REQUIRE_TLS"] == "boolean",
    SEND_MAIL_AFTER_DAILY_UPDATE:  process.env["SEND_MAIL_AFTER_DAILY_UPDATE"] == "boolean",
 }

/*
 * Checks before bootstrapping application
 */
if (!EXPRESS_SERVER_MODE) {
  console.error(
    'Express Server mode is either http or https. Please pick your mode! Well, actually only http is supported in this version.',
  );
  process.exit(1);
}

const dir: string = STORE_SOURCE_DIRECTORY;
const file: string = CSV_SOURCE_FILE;
if (!dir || !isString(dir) || !file || !isString(file)) {
  console.error('Critical error: Conversion Rates environment settings are not configured.');
  process.exit(1);
}
