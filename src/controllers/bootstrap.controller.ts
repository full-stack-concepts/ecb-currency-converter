import { DataController } from './data.controller';
import { currencyStore } from '../store/currency.store';

export class BootstrapController {
  /***
   * Bootstrap Sequence
   */
  async init() {
    // retrieve rates from ECB
    const data = await DataController.getData();

    // populate store and create conversion tables
    await currencyStore.set(data);

    /***
     * Maintainance Loader
     */
    DataController.refreshECBData.subscribe(async (x: number) => {
      // retrieve rates from ECB
      const data = await DataController.getData();

      // populate store and create conversion tables
      await currencyStore.set(data);

      console.log('*** Data reloaded');
    });
  }
}

export const bootstrapController = new BootstrapController();
