import express from 'express';
import { Router, Request, Response, NextFunction } from 'express';

import { A } from '../services';

class ConversionRouter {
    
    // ref tot Express instance
    public express: express.Application;
    public router: Router;

    constructor() {
        this.router = express.Router();
        this.middleware();
        this.setRoutes();
    }

    private middleware(): void {}

    private setRoutes(): void {

        this.router.get('/', (req: Request, res: Response, next: NextFunction) =>
            res.status(200).json({ message: 'Would you not like to convert a currency against the EURO?' }),
        );

        this.router.get('/:currency/:target_currency/:amount', async (req: Request, res: Response, next: NextFunction) => {
            let result;
            try {
                const { currency, target_currency, amount } = req.params; 
                const result = await A.execute ("convert", {currency, target_currency, amount});                    
                res.status(200).json(result);
            } catch (e) {
                next(e);
            } 
        });

        this.router.get('/h/:date/:currency/:target_currency/:amount', async( req:Request, res:Response, next:NextFunction) => {
            try {
              const { date, currency, target_currency, amount } = req.params;
              const result = await A.execute ("hConvert", {date, currency, target_currency, amount});
              res.status(200).json(result);
            } catch(e) { next(e); }
        });

        this.router.get('/range', async(req: Request, res: Response, next: NextFunction ) => {
            try {
                const result = await A.execute("getDateRange", {})
                res.status(200).json(result);
            } catch (e) { next(e); }
        });

        this.router.get('/currencies', async(req: Request, res: Response, next: NextFunction ) => {
            try {
                const result = await A.execute("getCurrencies", {})
                res.status(200).json(result);
            } catch (e) { next(e); }
        });
    }
}

// Create Public Router and Export it
const conversionRouter = new ConversionRouter();
const router: Router = conversionRouter.router;
export default router;
