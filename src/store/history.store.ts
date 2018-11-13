import path from "path";
import fs from 'fs';
import jsonfile from "jsonfile";
const rootPath = require("app-root-path");

import { IConversionTable } from '../types';

import { 
    STORE_SOURCE_DIRECTORY
} from '../util/secrets';

import {
    StoreHelper
} from "./helper";

interface rateEntry {
    currency: string,
    rate:string
}

interface HistoricalEntry {
    date: string,
    timestamp:number,
    rates: rateEntry[],
}

const waitFor = (ms:Number) => new Promise(r => setTimeout(r, ms));

const asyncForEach = async (array:any[], callback:Function) => {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}

class HistoricalStoreData {   

    private _currencies:string[];
    private _dateEntries:Object;
    private _dates:string[];
    private _logDates:string[] = [];

    public set currencies(c:string[]) {this._currencies = c; }
    public get currencies() { return this._currencies; }

    public set dateEntries(d:Object) {this._dateEntries = d; }
    public get dateEntries() { return this._dateEntries; }

    public set dates(d:string[]) {this._dates = d; }
    public get dates() { return this._dates; }

    public logDate(d:string) { this._logDates.push(d) }
    public getLogDates():string[] { return this._logDates; }

}

export const historicalStoreData = new HistoricalStoreData();

export class HistoryStore {

    private storePath(file:string):string {
         return path.join( 
            rootPath.path.toString(), 
            STORE_SOURCE_DIRECTORY, 
            file
        );                
    }

    private storageObject(
        entry:HistoricalEntry, 
        file:string, 
        conversionTables:any
    ) {
        return {
            date: entry.date,
            file,
            timestamp: entry.timestamp,
            conversionTables
        }
    }

     private async buildConversionTables(
         items:HistoricalEntry[],
         currencies:string[]
    ) {

        return Promise.all(

            // Loop through all historical ECB entries( last 90 days)            
            items.map( async ( entry:HistoricalEntry) => {

                // conversion tables for this entry
                const conversionTables: any = await StoreHelper.buildConversionTablesForDateEntry( entry.rates, currencies)

                // Convert any conversions array to Object for faster lookup                                
                conversionTables.forEach ( (table:any, index:number) => {
                    let c:Object = {};
                    const keys:any = Object.keys(table.conversions).forEach( (key:string, index:any) => {                      
                        c[key] = table.conversions[key];                    
                    });                  
                    conversionTables[index].conversions = c;                    
                });                    
                
                // Build Data Entry Object, then return it                
                const file = `${entry.date}.conversions.json`;
                const pathToFile = this.storePath(file);
                const dateEntryObject:any = this.storageObject(entry, file, conversionTables);    

                return dateEntryObject;

            })
        )

        .then( (dateEntryObjects:any[]) => Promise.resolve( dateEntryObjects));         
    }

    private async saveHistoricalEntriesToDisk(
        dateEntryObjects:any[], 
        interval:number
    ) {
            
        await asyncForEach( dateEntryObjects, async ( entry:any) => {               

            // Await timeout: while testing this app nodemon restarted without timeout                            
            await waitFor(interval);                       
            
            // Create path file         
            const pathToFile:string = this.storePath(entry.file);                 

            // Save Data Entry Object to file            
            if(!fs.existsSync(pathToFile)) {
                jsonfile.writeFileSync(pathToFile, entry);            
            } 
        });   

        return;     
    };

    private saveHistoricalEntriesToStoreInMemory (dateEntryObjects:any[]): void  {

        // Convert to Object with date as associative property
        let d:Object = {};
        let dates:string[] = [];
        dateEntryObjects.forEach ( (entryObject:any, index:number) => {                
            const {date} = entryObject;        
            d[date] = entryObject;
            dates.push(date);                                 
        });   

        // assign generated data to store
        historicalStoreData.dateEntries = d;
        historicalStoreData.dates = dates;
    }   

    public async set( { currencies, historicalEntries}: any): Promise<void> {     

        // assign currencies to historical Store 
        historicalStoreData.currencies = currencies;                

       /***
        * Build Date Entry Lookup objects
        */  
       const dateEntryObjects:any[] = await this.buildConversionTables(historicalEntries, currencies);

       // Save entries to disk
       await this.saveHistoricalEntriesToDisk(dateEntryObjects, 25);  

       // add results to store  
       this.saveHistoricalEntriesToStoreInMemory(dateEntryObjects);

       return Promise.resolve();
    }    
}

export const historyStore = async ( action:string, {...args}:any ) => {
    
    const instance:HistoryStore = new HistoryStore();

    const result = await instance[action]({...args});
}


