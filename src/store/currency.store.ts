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

import { IRate } from '../types';

/*****
 * Currency Store
 * builds rates array per foreign currency against other supported currencies
 */
export class CurrencyStore {
  // Currencies
  private currencies: string[] = [];

  // Rates
  private rates: IRate[] = [];

  private getSingleRate = (entry: any) => entry[Object.keys(entry)[1]];

  private getSingleCurrency = (entry: any) => entry[Object.keys(entry)[0]].toLowerCase();

  private buildCurrencies = (_rates: any) => _rates.map((_rate: any) => this.getSingleCurrency(_rate));

  private calculateReversedRatePerCurrency(_rates: any) {
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

  private sortConversionsForThisCurrency(rate: IRate): any {
    // sort conversions object for this currency
    const _conversions: any[] = deepCloneObject(rate.conversions);
    const conversions: any[] = [];

    Object.keys(_conversions)
      .sort()
      .forEach((key: string) => (conversions[key] = _conversions[key]));

    rate.conversions = conversions;
    return rate;
  }

  /***
   * Add for each base currency conversion rates per target currencies
   */
  private buildConversionsObjectPerCurrency = (rates: IRate[], currencies: string[]) => {
    return rates.map((_rate: any) => {
      let rate: any = deepCloneObject(_rate);
      const currentCurrency = this.getSingleCurrency(rate);

      /***
       * Build conversions object per currency
       */
      currencies.forEach((currency: string) => {
        /****
         * Any currency unit but euro
         */
        if (currency !== currentCurrency && currency !== 'euro' && currency !== 'eur') {
          const fRate = rates.find((rate: IRate) => rate.currency === currency); // get foreign rate
          rate.conversions[currency.toLowerCase()] = {
            to: rate.reverseRate * fRate.rate, // single unit to foreign currency
            from: (1 / fRate.rate) * rate.rate, // reverse
          };

          /****
           * Currency unit euro
           */
        } else {
          rate.conversions[currency.toLowerCase()] = {
            to: rate.reverseRate, // single unit to foreign currency
            from: parseFloat(rate.rate), // reverse
          };
        }
      });

      // sort conversions object for this currency
      rate = this.sortConversionsForThisCurrency(rate);
      return rate;
    });
  };

  private cleanRatesForThisCurrency(_rates: IRate[], clean: string[]) {
    let rates: IRate[];
    clean.forEach(
      (c: string) => (rates = _rates.filter((rate: any) => rate.currency !== 'eur' || rate.currency !== 'euro')),
    );
    return rates;
  }

  private compareByCurrency(a: any, b: any) {
    const prop = 'currency';
    if (a[prop] < b[prop]) return -1;
    if (a[prop] > b[prop]) return 1;
    return 0;
  }

  private addEuroRates = (rates: any[]) => {
    const _newRates: IRate[] = [];

    ['eur', 'euro'].forEach((c: string) => _newRates.push({ currency: c, rate: 1, reverseRate: 1, conversions: {} }));

    _newRates.map((r: IRate) => {
      rates.forEach(
        (rate: any) =>
          (r.conversions[rate.currency] = { to: parseFloat(rate.rate), from: parseFloat(rate.reverseRate) }),
      );
      rates = [...rates, r];
    });

    return rates;
  };

  // get currencies
  public getCurrencies = (): string[] => this.currencies;

  // get rates
  public getRates = (): IRate[] => this.rates;

  /***
   *
   */
  public set(_rates: any) {
    let err: Error;

    try {
      // build currencies array from raw data
      let currencies: string[] = this.buildCurrencies(_rates);

      // add eur(o) and then sort array
      currencies = [...currencies, 'eur', 'euro'].sort();

      // set store value: currencies
      this.currencies = currencies;

      // Calculate reverse rate against euro
      let rates: IRate[] = this.calculateReversedRatePerCurrency(_rates);

      // Build conversion table
      rates = this.buildConversionsObjectPerCurrency(rates, currencies);

      // Clean rates for temp euro entries
      rates = this.cleanRatesForThisCurrency(rates, ['eur', 'euro']);

      // add euro rates
      rates = this.addEuroRates(rates);

      // sort rates in alphabetical order
      rates = rates.sort(this.compareByCurrency);

      // set store value: rates
      this.rates = rates;
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

export const currencyStore: CurrencyStore = new CurrencyStore();
