import Mocha from "mocha"; 
import path from "path";
import { readdir, exists, stat } from 'fs';
import { promisify } from "util";

require("ts-mocha");
const rootPath = require("app-root-path");

import { waitFor, asyncForEach} from "../helpers";

/***
 * Promisify methods of Node core modules
 */
const [ $exists, $stat, $readdir] = [ exists, stat, readdir ].map(promisify);

/***
 * 
 */
export const runTests = async () => {

    // initiate a new mocha instance
    const mocha = new Mocha();

    // root directory
    const $root:string =  rootPath.path.toString();

    // define targetDirectory
    const $testDir = path.join( rootPath.path.toString(), "tests"); 

    // get directory context
    const files: string[] = await $readdir ( $testDir );

    console.log(files)

    await asyncForEach( files, async ( $file: string) => {      

        // build path
        const $pathToFile = path.join( $testDir, $file );

        // add each file so it can be exexuted;
        mocha.addFile( $pathToFile );

    });

    // set timeout so mocha can run test
    mocha.timeout(7500);

    let success:boolean=true;
    let failures:number;

    // execute tasks
    return new Promise ( (resolve, reject) => {

         mocha.run( (_failures:number) => {                        
            if( _failures != 0) success= false;                             
            resolve({ success: success, failures: _failures });
        });
    });   

}