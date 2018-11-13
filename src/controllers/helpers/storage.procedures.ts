import path from "path";
import { readFile, writeFile } from "jsonfile";
import { readdir, exists, stat } from 'fs';
import { promisify } from "util";
import Mocha from "mocha"; 
require("ts-mocha");
const rootPath = require("app-root-path");

import { waitFor, asyncForEach} from "../helpers";


import {
    STORE_SOURCE_DIRECTORY
} from "../../util/secrets";

interface rateEntry {
    currency: string,
    rate:string
}

interface HistoricalEntry {
    date: string,
    timestamp:number,
    rates: rateEntry[],
}

/***
 * Promisify methods of Node core modules
 */
const [ $exists, $stat, $readdir, $jsonReadFile, $jsonWriteFile] = [ exists, stat, readdir, readFile, writeFile ].map(promisify);


export const getPathToDataDir = ():string => { 
    return path.join( rootPath.path.toString(), STORE_SOURCE_DIRECTORY); 
}

/***
 * Store ECB Data Files
 */

const createFilePath = (date:string): string => {
    return path.join( 
        rootPath.path.toString(), 
        STORE_SOURCE_DIRECTORY, 
        date.toString()+".json"
    );
}

const saveRatesEntryFile = async (pathToFile:string, rates:rateEntry[] ) => {
    
    const fileExists = await $exists(pathToFile);
    return (!fileExists) ? await $jsonWriteFile(pathToFile, { rates: rates}) : null;      
}

export const saveHistoricalRates = async (entries:HistoricalEntry[]) => {      

    entries.forEach( async ({date,rates}:HistoricalEntry) => {          
        const pathToFile = createFilePath(date);        
        await saveRatesEntryFile(pathToFile, rates );
    });    

    return;
}

/***
 * Test stored data files in DATA directory
 */
export const validateStoreData = async () => {

    let errors: boolean[] = [];
    const $path = getPathToDataDir();

    const dirContent: string[] = await $readdir ( $path );
    const files:string[] = dirContent.filter((file: string) => {
        return file.match(/\.(json|conversion)/gi);
    });    
    
  
    await asyncForEach( files, async ( $file: string) => {               

        try {

            let valid: boolean;        
            await waitFor(25); 

            const $pathToFile =  path.join( $path, $file);  
            const json = await $jsonReadFile ($pathToFile);                      
            valid = (typeof json === 'object');                                
            errors.push(valid);
        }
        catch (e) {             
            errors.push(false); 
        }            
    });       

    const hasErrors: boolean = errors.some ( (err:boolean) => err === false);

    return (hasErrors) ? {
        hasErrors,
        message: "Historical Data build failed - some ECB date entries have corrupted entries or its associated file was not found."
    } : {
        hasErrors,
        message: "Historical Data build completed"
    }
}

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

    let failures:number;

    // execute tasks
    return new Promise ( (resolve, reject) => {

         mocha.run( (_failures:number) => {                                                
            resolve({ failures: _failures });
        });
    });   

}










