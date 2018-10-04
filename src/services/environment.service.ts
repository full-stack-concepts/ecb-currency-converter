import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import csv from 'csvtojson';
const rootPath = require('app-root-path'); // nod declaration file

/***
 * Get setting for production environment
 */
const NODE_ENV: string = process.env.NODE_ENV;

export class EnvironmentService {
  /***
   * Application Root Path
   */
  private rootPath: string = rootPath.path.toString();

  /***
   * Path to development and productoinenvironment from app root
   */
  private pathToDevelopmentSettingsDirectory: string = './env';
  private prodToProdctionSettingsDirectory: string = './prod';

  /***
   * Source Dir
   */
  private srcDir: string;

  /***
   * File encoding
   */
  private encoding: string = 'utf8';

  private parse: Function = dotenv.parse.bind(dotenv);

  constructor(pathTo?: string, encoding?: string) {
    if (pathTo) this.evalPath(pathTo);
    if (encoding) this.encoding = encoding;
  }

  evalPath(pathTo: string) {
    switch (pathTo) {
      case 'dev':
      case 'development':
        this.srcDir = path.join(this.rootPath, this.pathToDevelopmentSettingsDirectory);
        break;
      case 'prod':
      case 'production':
        this.srcDir = path.join(this.rootPath, this.prodToProdctionSettingsDirectory);
        break;
      default:
        console.error('Critical Error: No development environment specified');
        process.exit(1);
        break;
    }
  }

  /****
   * @path: optional string
   */
  public loadEnvironmentalVariables(): string[] {
    let err: Error;
    let files: string[];

    try {
      /****
       * Filter .env. files
       */

      const dirContent: string[] = fs.readdirSync(this.pathToDevelopmentSettingsDirectory);
      files = dirContent.filter((file: string) => {
        return file.match(/.*\.env\./gi);
      });

      /****
       * Filter example files
       */
      files = files.filter((file: string) => !file.match(/.*example/gi));

      /***
       * Parse file
       */
      files.forEach((file: string) => {
        const pathToFile: string = path.join(this.rootPath, 'env', file);
        if (fs.existsSync(pathToFile)) {
          dotenv.config({ path: pathToFile });
        }
      });
    } catch (e) {
      err = e;
    } finally {
      /****
       * Critical Error
       */
      if (err) {
        console.error('Critical Error: could not load environmental files ', err.message);
        process.exit(1);

        /****
         * Return to caller
         */
      } else {
        return;
      }
    }
  }
}

export const environmentService: EnvironmentService = new EnvironmentService(NODE_ENV);
