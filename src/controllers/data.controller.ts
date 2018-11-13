import path from 'path';
import util from 'util';
import fs from 'fs';
import request from 'request-promise';
import { Subject, Observable, Subscription, interval, timer } from 'rxjs';
import { Parser } from 'xml2js';
import moment from "moment-timezone";
const rootPath = require("app-root-path");

import { currencyStore } from '../store/currency.store';
import { historyStore, historicalStoreData } from '../store/history.store';
import { EmailController } from "../controllers";

import { validateStoreData, saveHistoricalRates, runTests } from "./helpers";

import { 
    ONLINE_XML_SOURCE, ONLINE_XML_LAST_90_DAYS, STORE_SOURCE_DIRECTORY,
    MY_TIME_ZONE, ECB_TIME_ZONE, DATE_FORMAT,
    RELOAD_RANGE, RELOAD_HOURS, RELOAD_MINUTES    
} from '../util/secrets';

import {
    setDefaultTimezone, getCurrentTimestamp, getTargetTimestampForTimeZone, getFormattedDate, getOffsetbetweenTimeZones,
    getDateVars, defineTargetTime
} from "../util/date.functions";

const waitFor = (ms:number) => new Promise(r => setTimeout(r, ms));

const asyncForEach = async (array:any[], callback:Function) => {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}

const parser:any = new Parser();
parser.parseString = util.promisify(parser.parseString);

interface DateEntry {
    $: Object,
    Cube: any[];
}

interface rateEntry {
    currency: string,
    rate:string
}

interface HistoricalEntry {
    date: string,
    timestamp:number,
    rates: rateEntry[],
}

export class DataController {

    // a little bit of state management
    static loading: boolean = false;
    static ratesLoaded: boolean = false;
    static historicalRatesLoaded: boolean = false;

    static rates: any[];

    static refreshECBData$ = interval(10000);

    /***
     * Log Critical Error
     * @err:Error
     */
    static err(err: Error) { process.exit(1); }

    static get(url:string) {
        return new Promise((resolve, reject) => {
            return request({ method: 'GET', uri: url }, (error: Error, response: any, body: any) => {
                const r = { error, response, body };
                    parser.parseString(body).then((json: any) => {
                    return resolve(json);
                });
            });
        });
    }

    // build rates array and convert each currency value to lower case
    static buildRatesArrayPerDateEntry(data:DateEntry[]) {            
        return data.reduce((_rates: rateEntry[] = [], entry: any) => {
            entry['$']['currency'] = entry['$']['currency'].toLowerCase();
            _rates.push(entry['$']);
            return _rates;
        }, []);
    }

    static async parseCurrentRates(json: any) {
        try {

            // Extract XML Object and convert to rates array
            const mKey = Object.keys(json)[0];
            const data: any = json[mKey].Cube[0].Cube[0].Cube;      

            // build rates array and convert each currency value to lower case
            const rates: rateEntry[] = this.buildRatesArrayPerDateEntry(data);         

            // Terminate master loader if running
            this.ratesLoaded = true; 
            return Promise.resolve(rates);

        } catch (e) {
            this.err(e);
        }
    }

    static async parseHistoricalRates(json:any) {      

        const mKey = Object.keys(json)[0];         
        const data: DateEntry[] = json[mKey].Cube[0].Cube;

        const items:HistoricalEntry[] = data.map( (entry:any) => {
            const date = entry["$"].time;
            return {
                date, // date in string format,
                timestamp: (new Date(date)).getTime(),
                rates: this.buildRatesArrayPerDateEntry(entry.Cube)
            };         
        });   

        await saveHistoricalRates(items);  

        // signal master interval that everything has loaded
        this.historicalRatesLoaded = true;       

        return items;
    }

    /***
     * Load Concurrent Conversion Rates from ECB Store
     * Load Historical Conversion Rates from ECB Store (last 90 days)
     * Master Loader: terminates when data has been retrieved and parsed
     */
    static async getECBData() {

        const counter$ = interval(1000);
        let currentEntry:any;   
        let historicalEntries:HistoricalEntry[];
        let $sub:Subscription;     

        return new Promise((resolve, reject) => {

            return $sub = counter$.subscribe( async (x: number) => {
                
                // Get Current Conversoin Rates                    
                if(!this.ratesLoaded) {
                    const cJSON: any = await this.get(ONLINE_XML_SOURCE);                                        
                    currentEntry = await this.parseCurrentRates(cJSON);
                }

                // Get historical conversion Rates (last 90 dates)                                    
                if(!this.historicalRatesLoaded) {                   
                    const hJSON: any = await this.get(ONLINE_XML_LAST_90_DAYS);   
                    historicalEntries = await this.parseHistoricalRates(hJSON);       
                }

                // && this.historicalRatesLoaded
                if (this.ratesLoaded && this.historicalRatesLoaded) {
                    console.log("*** Killing master interval")
                    $sub.unsubscribe();
                    this.restLoadIndicatorsValues();
                    resolve({ currentEntry, historicalEntries});                   
                }
            });
        });
    }   

    static restLoadIndicatorsValues() {
        this.ratesLoaded = false;
        this.historicalRatesLoaded = false;
    }

    static getPathToDataDir():string { 
        return path.join( rootPath.path.toString(), STORE_SOURCE_DIRECTORY); 
    }

    static async testInfrastructure():Promise<boolean> {        
        const dir = this.getPathToDataDir();
        (!fs.existsSync(dir)) ? fs.mkdirSync(dir) : null;
        return Promise.resolve(true);        
    }    

    /***
     * ON INIT
     */
    static async init() {        
        
        await this.testInfrastructure();
        
        // retrieve current rates from ECB
        const {currentEntry, historicalEntries}:any = await this.getECBData(); 
        
        // return if no data  was retrieved -> sequence runs till data has arrived
        if(!historicalEntries || !currentEntry) return;      
       
        // populate store and create conversion tables for current rates
        await currencyStore("set", {data: currentEntry} );
       
        // get list of currencies
        const currencies: string[] = await currencyStore("getCurrencies", {});    
        
        /***
         * Populate historical store 
         * Create conversions tables per currency per data entry
         */
        await historyStore("set", {
            currencies,
            historicalEntries
        });

        return;
    }

    static async sendEmail( eventID:string) {
        const result = await EmailController.exec( "sendSystemEmail", { eventID } );
        return result;
    }    

    static async sendErrorEmail( message?: string | Error) {
        const result = await EmailController.exec( "sendErrorEmail", { message } );
        return result;
    }   

    static getSecondsToTargetTime(): number {

        let offset: number,
            targetTS: number,
            currentTS: number,
            timer:number;

            // set default timezone          
            // setDefaultTimezone(MY_TIME_ZONE);   
            moment.tz.setDefault ( MY_TIME_ZONE );         

            // define offset between time zones
            offset = getOffsetbetweenTimeZones(MY_TIME_ZONE, ECB_TIME_ZONE);

            // define cirrent timestamp in seconds
            currentTS = Math.round( new Date().getTime() / 1000 );      

            // define target time in seconds
            targetTS = defineTargetTime( RELOAD_HOURS, RELOAD_MINUTES, offset );             

            // calculate time difference in seconds
            timer = Math.abs(targetTS - currentTS);

            return timer;        
    }

    /***
     * (1) Reload current and historical data
     * (2) Validate store data
     * (3) Run unit tests
     * @logDate: string
     */
    static async reloadECBStore( logDate :string) {

        let err: Error;
        try {
            // load current and historical data
            await this.init();         
           
            /***
             * Validate stored files        
             */ 
            const { hasErrors, message }: any = await validateStoreData();                
            if(hasErrors) throw new Error("Invalid Store Configuration");
           
            /***
             * Run Unit Tests
             * Note : yet to implement
             */ 
            /*
            const { failures }: any = await runTests();    
            if( failures > 0) throw new Error( `Test Error: failures: ${failures}`);         
            */

            // log date of this updage
            historicalStoreData.logDate(logDate);                  
        }
        catch(e) { 
            err = e; 
            console.log("*** Data COntroller ", err, err.message);
        }
        finally {
            if(!err) {
                await this.sendEmail( "system.data.daily.reload");               
            } else {                
                await this.sendErrorEmail( err.message );     
            }
        }
    }

    static evalTargetTime() {

        // get seconds to next update
        const TIMER: number = this.getSecondsToTargetTime();     

        console.log("*** Timer ", TIMER, "LAUNCH UPDATE ", TIMER <= RELOAD_RANGE );

        // try to reload if time difference in seconds in within range of designated interval
        if( TIMER <= RELOAD_RANGE) {        

            // if update is successfull historyStore needs to be updated
            // for this we shall use an array of dates in historyStore
            const logDate:string = getFormattedDate();

            const logDates = historicalStoreData.getLogDates();

            const hasCurrentLogDate:boolean = logDates.some( (str:string) => str === logDate);                       

            if(!hasCurrentLogDate) { this.reloadECBStore(logDate); }                    
        }        
     
    }

    static refreshData() {      

        this.refreshECBData$.subscribe( async (x: number) => {                                
            this.evalTargetTime();
        });
    }
}





