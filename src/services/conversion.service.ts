import { currencyStore } from '../store/currency.store';

import { getPrecision, makeDecimal, divide, multiply, toFloat, toCurrencyString, isFloat } from '../util/decimals';

export class ConversionService {
  private currencies: string[] = [];
  private rates: any[] = [];
  private amount: number;
  private currency: string;
  private foreignCurrency: string;

  constructor() {
    this.currencies = currencyStore.getCurrencies();   
    this.rates = currencyStore.getRates();
  }

  private findCurrency(c: string): boolean {
    return this.currencies.filter((_c: string) => _c === c.toLowerCase()).length === 1;
  }

  private findRate(c: string): boolean {
    return this.rates.find((item: any) => {
      const k: string = Object.keys(item)[0];
      if (item[k] === c.toLowerCase()) return item;
    });
  }

  private async validate(c: string, fC: string, amount: string): Promise<any> {
    let err: Error;

    try {
      // amount
      const cAmount = parseFloat(amount);
      if (!amount || isNaN(parseFloat(amount))) throw new Error('Invalid amount specified');

      // base currency
      if (!this.findCurrency(c)) throw new Error('Invalid Base Currency');

      // foreign currency
      if (!this.findCurrency(fC)) throw new Error('Invalid Foreign Currency');

      // find rate object for base currency
      const baseRateObject: Object = this.findRate(c);
      if (!baseRateObject) throw new Error('No rate object found for this currency');
    } catch (e) {
      err = e;
    } finally {
      return err ? Promise.reject(err) : Promise.resolve();
    }
  }

  private findConversionRate(conversions: any, c: string) {
    return conversions[c] || { rate: 1, reverseRate: 1 };
  }

  /***
   *
   */
  public async convert(c: string, fC: string, amount: string) {
    let err: Error;

    let 
      raw: number, 
      result: number, 
      cAmount: number, 
      cRate: any, 
      responseObject: any;

    try {
      // validate query paramns
      await this.validate(c, fC, amount);

      const baseRateObject: any = this.findRate(c);

      // convert currencies to lowercase
      c = c.toLowerCase();
      fC = fC.toLowerCase();
      cAmount = parseFloat(amount);

      const { conversions } = baseRateObject;

      cRate = this.findConversionRate(conversions, fC);

      /***
       * Scenario I: Base currency equals target currency
       */
      if (c === fC) {
        raw = cAmount;
        result = makeDecimal(raw, 2);

        /***
         * Scenario II : Base currency differs from target currency
         */
      } else {

        /***
         * Scenario II A: Base currency is euro
         */
        if (c === 'eur' || c === 'euro') {
          raw = cAmount * cRate.to;

          /***
           * Scenario II B: Base currency is euro
           */
        } else if (fC === 'eur' || fC === 'euro') {
          raw = cAmount * cRate.to;

          /***
           * Scenario II C: Base currency <> euro
           */
        } else {
          raw = cAmount * cRate.to;
        }

        result = makeDecimal(raw, 2);
      }

      // correction for xtreme currency conversions
      if (result < 0.01) result = 0.01;

      console.log('==> Final Result ', cAmount, ' => ', raw, result);

      responseObject = {
        base_currency: c.toUpperCase(),
        target_currency: fC.toUpperCase(),
        amount: cAmount,
        raw: raw,
        result: result,
        ts: Date.now(),
      };

      // Add rates object only when base currency unequals target currenct
      if (c !== fC) {
        responseObject.rates = {
          [`${c}->${fC}`]: cRate.to || 1,
          [`${fC}->${c}`]: cRate.from || 1,
        };
      }
    // add available currencies on error
    } catch (e) {
      err = e;
    } finally {
      return err ? Promise.reject({err, currencies: this.currencies}) : Promise.resolve(responseObject);
    }
  }
}

export class A {
  static convert(c: string, fC: string, amount: string) {
    const instance = new ConversionService();
    return instance.convert(c, fC, amount);
  }
}
