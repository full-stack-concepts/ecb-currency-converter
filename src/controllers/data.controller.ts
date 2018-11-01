import path from 'path';
import util from 'util';
import fs from 'fs';
import request from 'request-promise';
import jsonfile from "jsonfile";
import { Subject, Observable, Subscription, interval } from 'rxjs';
import { Parser } from 'xml2js';
import moment from "moment-timezone";
const rootPath = require("app-root-path");

import { currencyStore } from '../store/currency.store';
import { historyStore, historicalStoreData } from '../store/history.store';

import { 
    ONLINE_XML_SOURCE, ONLINE_XML_LAST_90_DAYS, STORE_SOURCE_DIRECTORY,
    MY_TIME_ZONE, ECB_TIME_ZONE, DATE_FORMAT,
    RELOAD_RANGE, RELOAD_HOURS, RELOAD_MINUTES    
} from '../util/secrets';

import {
    setDefaultTimezone, getCurrentTimestamp, getTargetTimestampForTimeZone, getFormattedDate, getOffsetbetweenTimeZones,
    getDateVars, defineTargetTime
} from "../util/date.functions";

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
    static ratesLoaded: boolean;
    static historicalRatesLoaded: boolean;    

    static rates: any[];

    static refreshECBData$ = interval(10000);

    /***
     * Log Critical Error
     * @err:Error
     */
    static err(err: Error) {
        console.error(err);
        process.exit(1);
    }

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

        await this.saveHistoricalRates(items);  

        // signal master interval that everything has loaded
        this.historicalRatesLoaded = true;       

        return items;
    }

    static _createFilePath = (date:string):string => {
        return path.join( 
            rootPath.path.toString(), 
            STORE_SOURCE_DIRECTORY, 
            date.toString()+".json"
        );
    }

    static _saveRatesEntryFile = (pathToFile:string, rates:rateEntry[] ) => {
        if(!fs.existsSync(pathToFile)) {
            return jsonfile.writeFileSync(pathToFile, { rates: rates});            
        } else {
            return;
        }
    }

    static async saveHistoricalRates(entries:HistoricalEntry[]) {      

        entries.forEach( ({date,rates}:HistoricalEntry) => {          
            const pathToFile = this._createFilePath(date);  
            console.log(date);
            this._saveRatesEntryFile(pathToFile, rates );
        });              
        return Promise.resolve();
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
        this.ratesLoaded = !this.ratesLoaded;
        this.historicalRatesLoaded = !this.historicalRatesLoaded;
    }

    /***
     * 
     */
    static async testInfrastructure():Promise<boolean> {        
        const dir = path.join( rootPath.path.toString(), STORE_SOURCE_DIRECTORY);
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

    static refreshData() {  

        let offset: number,
            targetTS: number,
            currentTS: number,
            TIMER:number,
            RELOAD_PROCESS:boolean = false;

        this.refreshECBData$.subscribe( async (x: number) => {

            console.log("Maintenance Interval ", x);       

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
            TIMER = Math.abs(targetTS - currentTS);

            // try to reload if time difference in seconds in within range of designated interval
            if( TIMER <= RELOAD_RANGE)  RELOAD_PROCESS = true;

            console.log("*** Should we do something ", TIMER <= RELOAD_RANGE );

            // reload 
            if(RELOAD_PROCESS) {

                console.log(" *** START DAILY UPDATE PROCESS");    

                // if update is successfull historyStore needs to be updated
                // for this we shall use an array of dates in historyStore
                const logDate:string = getFormattedDate();

                const logDates = historicalStoreData.getLogDates();

                const hasCurrentLogDate:boolean = logDates.some( (str:string) => str === logDate);

                console.log("Update has run ", hasCurrentLogDate);
                

                if(!hasCurrentLogDate) {

                    console.log("*** STart Loading Data");
                    // load data
                    await this.init();

                    // update log
                    historicalStoreData.logDate(logDate);            
                }

                RELOAD_PROCESS = false;
                
            }

            console.log("*** Timer ", TIMER )
         
        });
    }
}





