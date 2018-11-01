import { DataController } from './data.controller';
import { currencyStore } from '../store/currency.store';
import { historyStore } from '../store/history.store';

export class BootstrapController {

    /***
    * Bootstrap Sequence
    */
    async init() {
        
        try{            
            /***
             * LOad ECB Data
             */
            await DataController.init();

            /***
             * Launch Maintainance Interval
             * Responsible for daily update
             */
            DataController.refreshData();

        }
        catch(e) {
            console.log(e);
        }    
    }
}

export const bootstrapController = new BootstrapController();
