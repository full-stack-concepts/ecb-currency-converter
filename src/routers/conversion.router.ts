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

    this.router.get('/:currency/:foreign_currency/:amount', async (req: Request, res: Response, next: NextFunction) => {
      let result;
      try {
        const { currency, foreign_currency, amount } = req.params;
        result = await A.convert(currency, foreign_currency, amount);
        res.status(200).json(result);
      } catch (e) {
        next(e);
      } 
    });
  }
}

// Create Public Router and Export it
const conversionRouter = new ConversionRouter();
const router: Router = conversionRouter.router;
export default router;
