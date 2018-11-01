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

/***
 * 
 */


/***
 * 
 */
const getSingleCurrency = (entry: any) => entry[Object.keys(entry)[0]].toLowerCase();

const sortConversionsForThisCurrency = ( _conversions: any): any => {

    const conversions: any[] = [];

    Object.keys(_conversions).sort()
    .forEach((key: string) => (conversions[key] = _conversions[key]));   

    return conversions;
}

const compareByCurrency = (a: any, b: any) => {
    const prop = 'currency';
    if (a[prop] < b[prop]) return -1;
    if (a[prop] > b[prop]) return 1;
    return 0;
}

export class StoreHelper {

    private static getSingleRate = (entry: any) => entry[Object.keys(entry)[1]];

    private static getSingleCurrency = (entry: any) => entry[Object.keys(entry)[0]].toLowerCase();

    private static calculateReversedRatePerCurrency(_rates: any) {
    
        return _rates.map((entry: any) => {
            // get conversion rate to euro
            const rate: number = this.getSingleRate(entry);

            // get reverse rate
            const reverseRate: number = 1 / rate; // single foreign currency unit against euro

            entry.rate = parseFloat(entry.rate);
            entry.reverseRate = reverseRate;

            // build conversions object for fast lookup
            entry.conversions = {};

            return entry;
        });
    }

    /***
     * Add for each base currency conversion rates per target currencies
     */
    private static buildConversionTablePerCurrency = (rates: IConversionTable[], currencies: string[]) => {      
        
        return rates.map((_rate: any) => {
            
            let rate: any = deepCloneObject(_rate);
            const currentCurrency = getSingleCurrency(rate);         

            /***
             * Build conversions object per currency
             */
            currencies.forEach((currency: string) => {     

                /****
                 * Any currency unit but euro
                 */
                if (currency !== currentCurrency && currency !== 'euro' && currency !== 'eur') {
                    // console.log("***** Non Euro Currency")
                    const fRate = rates.find((rate: IConversionTable) => rate.currency === currency); // get foreign rate
                    rate.conversions[currency.toLowerCase()] = {
                        to: rate.reverseRate * fRate.rate, // single unit to foreign currency
                        from: (1 / fRate.rate) * rate.rate // reverse
                    };

                /****
                 * Currency unit euro
                 */
                } else {
                    // console.log("***** Euro Currency")
                    rate.conversions[currency.toLowerCase()] = {
                        to: rate.reverseRate, // single unit to foreign currency
                        from: parseFloat(rate.rate), // reverse
                    };
                }                
            });                    
            
            // sort conversions object for this currency
            rate.conversions = sortConversionsForThisCurrency(rate.conversions);                  
        
            return rate;
        });
    }

    private static cleanRatesForThisCurrency(_rates: IConversionTable[], clean: string[]) {
        let rates: IConversionTable[];
        clean.map( (c: string) => 
            (rates = _rates.filter((rate: any) => rate.currency !== 'eur' || rate.currency !== 'euro'))
        );
        return rates;
    }

    private static addEuroRates = (rates: any[]) => {

        const _newRates: IConversionTable[] = [];

        ['eur', 'euro'].forEach((c: string) => _newRates.push({ currency: c, rate: 1, reverseRate: 1, conversions: {} }));

        _newRates.map((r: IConversionTable) => {
            rates.forEach( (rate: any) =>
                (r.conversions[rate.currency] = { to: parseFloat(rate.rate), from: parseFloat(rate.reverseRate) })
            );
            rates = [...rates, r];
        });

        return rates;
    };   

    public static buildConversionTablesForDateEntry( 
        data:any,
        currencies: string[] 
    ):IConversionTable[] {    

        let conversionTables: IConversionTable[];

        // Calculate reverse rate against euro
        conversionTables = this.calculateReversedRatePerCurrency(data);

        // add euro rates
        conversionTables = this.addEuroRates(conversionTables);

         // Build conversion table
        conversionTables = this.buildConversionTablePerCurrency(conversionTables, currencies);        

      
        // Clean rates for temp euro entries
        conversionTables = this.cleanRatesForThisCurrency(conversionTables, ['eur', 'euro']);        

        // sort rates in alphabetical order
        conversionTables = conversionTables.sort(compareByCurrency); 

        return conversionTables;
    }
}