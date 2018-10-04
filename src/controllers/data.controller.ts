import request from 'request-promise';
import { Observable, Subscription, interval } from 'rxjs';
const util = require('util');
const xml2js = require('xml2js');

import { ONLINE_XML_SOURCE, ECB_DATA_REFRESH_RATE } from '../util/secrets';

const parser = new xml2js.Parser();
parser.parseString = util.promisify(parser.parseString);

export class DataController {
  static ratesLoaded: boolean;

  static rates: any[];

  static getRatesFromECB() {
    return new Promise((resolve, reject) => {
      return request({ method: 'GET', uri: ONLINE_XML_SOURCE }, (error: Error, response: any, body: any) => {
        const r = { error, response, body };
        parser.parseString(body).then((json: any) => {
          return resolve(json);
        });
      });
    });
  }

  static async parseRates(json: any) {
    try {
      // Extract XML Object and convert to rates array
      const mKey = Object.keys(json)[0];
      const _data: any = json[mKey].Cube[0].Cube[0].Cube;      

      // build rates array and convert each currency value to lower case
      const rates: any[] = _data.reduce((_rates: any[] = [], entry: any) => {
        entry['$']['currency'] = entry['$']['currency'].toLowerCase();
        _rates.push(entry['$']);
        return _rates;
      }, []);

      // Terminate master loader if running
      this.ratesLoaded = true;

      return Promise.resolve(rates);
    } catch (e) {
      this.err(e);
    }
  }

  /***
   * Log Critical Error
   * @err:Error
   */
  static err(err: Error) {
    console.error(err);
    process.exit(1);
  }

  /***
   * Load Data
   */
  static async getData() {
    try {
      // Master Loader: terminates when data has been retrieved
      const masterCounter$ = interval(1000);
      return new Promise((resolve, reject) => {
        const $sub: Subscription = masterCounter$.subscribe(async (x: number) => {
          const json: any = await this.getRatesFromECB();
          const rates: any = await this.parseRates(json);
          if (this.ratesLoaded) {
            $sub.unsubscribe();
            resolve(rates);
          }
        });
      });
    } catch (e) {
      this.err(e);
    }
  } 

  /***
   * Keep on Loading
   * ECB pubblisjes new stats every day around 16.00
   */
  static refreshECBData = interval(60 * 60 * 1000);
}
