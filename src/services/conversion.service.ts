import { currencyStore, storeData } from '../store/currency.store';
import { historicalStoreData } from "../store/history.store";
import { getPrecision, makeDecimal, divide, multiply, toFloat, toCurrencyString, isFloat } from '../util/decimals';
import { getLengthDateString, testLengthStringFormat, validateDateString  } from "../util/date.functions";

export class ConversionService {
    
    private currencies: string[] = [];
    private conversionTables: any[] = [];
    private amount: number;
    private currency: string;
    private foreignCurrency: string;

    constructor() {            
        this.currencies = storeData.currencies;
        this.conversionTables = storeData.conversionTables;      
    }

    private findCurrency(c: string): boolean {
        return this.currencies.filter((_c: string) => _c === c.toLowerCase()).length === 1;
    }

    private findConversionTable(c: string): boolean {
        return this.conversionTables.find((item: any) => {
            const k: string = Object.keys(item)[0];
            if (item[k] === c.toLowerCase()) return item;
        });
    }

    private findConversionTablePerDateEntry(dateEntry: any, currency: string) {
        return dateEntry.conversionTables.find( (table: any) => {
            const currencyKey: string = Object.keys(table)[0];
            if (table[currencyKey] === currency.toLowerCase()) return table;
        });
    }

    private findSingleConversion(conversions: any, c: string) {
        return conversions[c] || { rate: 1, reverseRate: 1 };
    }

    private validateAmount(amount:string) {
        const cAmount = parseFloat(amount);
        if (!amount || isNaN(parseFloat(amount))) throw new Error('Invalid amount specified');
    }

    private validateBaseCurrrency(c:string): void {
         if (!this.findCurrency(c)) throw new Error('Invalid Base Currency');
    }

    private validateForeignCurrency(fC:string) : void {
        if (!this.findCurrency(fC)) throw new Error('Invalid Foreign Currency');
    }

    private hasMatchingConversionTable(c:string): void {
        const conversionTable: Object = this.findConversionTable(c);
        if (!conversionTable) throw new Error('No rate object found for this currency');
    }

    private testIfDateIsInHistoricalDataRange (d: string) : void {
        const supportedDates = historicalStoreData.dates;   
        if(!supportedDates.includes(d) ) throw new Error("Your query date is valid but out of range with ECB");
    }

    private async validate(c: string, fC: string, amount: string): Promise<any> {
    
        return Promise.all([
            this.validateAmount(amount), 
            this.validateBaseCurrrency(c), 
            this.validateForeignCurrency(fC), 
            this.hasMatchingConversionTable(c)
        ]);    
    }

    private async hValidate(d:string, c: string, fC: string, amount: string): Promise<any> {

        return Promise.all([
            testLengthStringFormat(d),        
            validateDateString(d),        
            this.testIfDateIsInHistoricalDataRange(d),    
            this.validateAmount(amount), 
            this.validateBaseCurrrency(c), 
            this.validateForeignCurrency(fC), 
            this.hasMatchingConversionTable(c)        
        ]);    
    }

    private async calculate(c: string, fC: string, amount: string, table: any ) {

        let 
            raw: number,
            result: number, 
            cAmount: number, 
            cRate: any;

        // convert currencies to lowercase
        c = c.toLowerCase();
        fC = fC.toLowerCase();
        cAmount = parseFloat(amount);

        const { conversions } = table;

        cRate = this.findSingleConversion(conversions, fC);

        // Scenario I: Base currency equals target currency    
        if (c === fC) {
            raw = cAmount;
            result = makeDecimal(raw, 2);

        // Scenario II : Base currency differs from target currency    
        } else {
            raw = cAmount * cRate.to;    
            result = makeDecimal(raw, 2);
        }

        // correction for xtreme currency conversions
        if (result < 0.01) result = 0.01;

        return { raw, result, cAmount, cRate }
    }

    private formatResponse({ currency, target_currency, cAmount, cRate, raw, result}: any) {

        const responseObject = {
            base_currency: currency.toUpperCase(),
            target_currency: target_currency.toUpperCase(),
            amount: cAmount,
            raw: raw,
            result: result,
            ts: Date.now(),
            rates: {}
        };

        // Add rates object only when base currency unequals target currenct
        if ( currency !== target_currency) {
            responseObject.rates = {
                [`${currency}->${target_currency}`]: cRate.to || 1,
                [`${target_currency}->${currency}`]: cRate.from || 1,
            };
        }

        return responseObject;
    }

    /***
     *
     */
    public async convert( {currency, target_currency, amount}: any ) {        
    
        let err: Error, 
            responseObject: any;     

        try {                      
            // validate query paramns
            await this.validate(currency, target_currency, amount);            

            const conversionTable: any = this.findConversionTable(currency);
            const { raw, result, cAmount, cRate } = await this.calculate(currency, target_currency, amount, conversionTable )   

            responseObject = this.formatResponse({currency, target_currency, cAmount, cRate, raw, result});         
    
        } catch (e) {
            err = e;
        } finally {
            return (err) ? ({err, currencies: this.currencies}) : (responseObject);
        }
    }

    /***
     * 
     */
    public async hConvert( {date, currency, target_currency, amount}: any) {

        let err:Error,
            responseObject: any;   
        try {    

            // validate query paramns
            await this.hValidate(date, currency, target_currency, amount);

            const dateEntry = historicalStoreData.dateEntries[date];
            const conversionTable = this.findConversionTablePerDateEntry(dateEntry, currency);
            const { raw, result, cAmount, cRate } = await this.calculate(currency, target_currency, amount, conversionTable )   

            responseObject = this.formatResponse({currency, target_currency, cAmount, cRate, raw, result});
       
        } catch (e) {
            err = e;
        } finally {
            return (err) ? ({
                err: err.message,
                currencies: this.currencies,
                supportedDates:  historicalStoreData.dates
            }) : (responseObject);
        }
     }

    public async getDateRange() { return { dates: historicalStoreData.dates}; }

    public async getCurrencies() { return { currencies: this.currencies}; }
}

export class A {
    static async execute ( action:string, {...args}:any ):Promise<any> {      
        const instance:ConversionService = new ConversionService();    
        const result = await instance[action]({...args});    
        return result;
    }
}
