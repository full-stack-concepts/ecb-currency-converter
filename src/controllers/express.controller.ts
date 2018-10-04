import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import { Router, Request, Response, NextFunction } from 'express';
const cors = require('cors');
const debug = require('debug')(`${process.env.APP_NAME}:bootstrapper`);

/***
 * Router Controllers
 */
import ConversionRouter from '../routers/conversion.router';

class ExpressController {
  // ref tot Express instance
  public express: express.Application;
  public router: Router;

  constructor() {
    // create router app with express
    this.express = express();
    this.router = express.Router();
    this.middleware();
    this.routes();
  }

  private middleware(): void {
    /***
     * secure your Express apps by setting various HTTP headers
     * info: https://www.npmjs.com/package/helmet
     */
    this.express.use(helmet());

    /***
     * Compress server output, supported types
     * @deflate
     * @gzip (default)
     */
    this.express.use(compression({}));

    /***
     * Cookie-parser: Parse Cookie header and populate req.cookies with an object keyed by the cookie names.
     * https://www.npmjs.com/package/cookie-parser
     */
    this.express.use(cookieParser());

    /***
     * Body-parser: Parse incoming request bodies in a middleware before your handlers, available under the req.body property (post requesst).
     * https://www.npmjs.com/package/body-parser
     */

    this.express.use(bodyParser.json());
    this.express.use(bodyParser.urlencoded({ extended: false }));
  }

  private routes(): void {
    this.express.get('/', (req: Request, res: Response, next: NextFunction) => {
      res.status(200).json({ message: 'Would you not like to convert a currency against the EURO?' });
    });

    /***
     *  Convertor API
     */
    this.express.use('/api/convert', ConversionRouter);

    this.express.get('*', (req: Request, res: Response, next: NextFunction) => {
      debug(`Route error: ${req.url}`);
      res.status(404).json({ message: `Not found: ${req.url}` });
    });

    /***
     * Error Handler
     */
    this.express.use(function(err: any, req: Request, res: Response, next: NextFunction) {
      debug(`Route error: ${req.url}`);    
      const message = (err.hasOwnProperty("err")) ? err.err.message : err.message;
      const supportedCurrencies:string[] = (err.hasOwnProperty("currencies")) ? err.currencies: undefined;
      res.json({
        message,
        status:false,
        supportedCurrencies
      });
    });
  }
}

export default new ExpressController().express;
