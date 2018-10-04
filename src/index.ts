import { createServer } from './server';
const debug = require('debug')(`${process.env.APP_NAME}:bootstrapper`);

const init = async () => {
	try {
    // throw new Error("*** Pasta");
    await createServer();
  } catch (e) {
    // console.error("*** Critical Error: ", e.message );
    debug(`Critical Error: ${e}`);
    process.exit(1);
  }
};

init();
