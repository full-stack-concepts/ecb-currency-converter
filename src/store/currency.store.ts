import {
  getPrecision,
  makeDecimal,
  divide,
  multiply,
  toFloat,
  toCurrencyString,
  isFloat,
  deepCloneObject,
  cloneArray,
} from '../util/decimals';

import { IConversionTable } from '../types';

import {
    StoreHelper
} from "./helper";

/*****
 * Currency Store
 * builds rates array per foreign currency against other supported currencies
 */

class StoreData {

    // Currencies
    private _currencies: string[] = [];

    // Conversion tables
    private _tables: IConversionTable[] = [];

    get currencies() {return this._currencies}
    set currencies(c) {this._currencies = c; }

    get conversionTables() {return this._tables}
    set conversionTables(c) {this._tables = c; }
}

export const storeData = new StoreData();


export class Store {

    // Currencies
    public currencies: string[] = [];

    // Rates
    public rates: IConversionTable[] = [];

    private getSingleRate = (entry: any) => entry[Object.keys(entry)[1]];

    private getSingleCurrency = (entry: any) => entry[Object.keys(entry)[0]].toLowerCase();

    private buildCurrencies = (_rates: any) => _rates.map((_rate: any) => this.getSingleCurrency(_rate));              

    // get currencies
    public getCurrencies = (): string[] => storeData.currencies;

    // get rates
    public getTables = (): IConversionTable[] => storeData.conversionTables;

    /***
     *
     */
    public set( {data}: any) {           

        let err: Error;      

        try {            
            // build currencies array from raw data
            let currencies: string[] = this.buildCurrencies(data);
            
            // add eur(o) and then sort array
            currencies = [...currencies, 'eur', 'euro'].sort();
          
            // set store value: currencies
            storeData.currencies = currencies;           

            storeData.conversionTables = StoreHelper.buildConversionTablesForDateEntry( data, currencies);       
            
        } catch (e) {
            err = e;
        } finally {
            if (err) {
                console.error('*** Critical error: ', err.message);
                process.exit(1);
        } else {
            return Promise.resolve();
        }
    }
  }
}

export const currencyStore = async ( action:string, {...args}:any ):Promise<any>  => {      
    const instance:Store = new Store();    
    const result = instance[action]({...args});    
    return result;
}
