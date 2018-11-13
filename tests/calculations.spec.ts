import { expect, assert } from "chai";
import { ONLINE_XML_SOURCE } from "../src/util/secrets";
import { DataController } from "../src/controllers";
import { currencyStore } from "../src/store/currency.store";
import { A } from "../src/services";
import { isFloat } from "../src/util/decimals";

before( async() => {

    /***
     * LOad ECB Data then populate store
     */
    await DataController.init();

	// lets do some testing
	return Promise.resolve();

});

describe("Currency Conversion", () => {

	const rates: any[] = [];
	let result: any;

	let to: string,
		from: string;

	/***
	 * Test Inoout errors
	 */
	describe( "Input Errors", () => {

		let err: Error;   

		before( async () => {
            try { 
                result = await A.execute ("convert", { 
                    currency: "hello", 
                    target_currency: "eur", 
                    amount: "1000"}
                );                           
            }
			catch(e) { 
                err = e;             
            }
		});

		it("should thow an error for invalid base currency",  () => expect(result.err).to.exist );

        before( async () => {
			err = undefined;
			try { 
                result = await A.execute ("convert", { 
                    currency: "eur", 
                    target_currency: "hello", 
                    amount: "1000"
                }); 
            }
			catch(e) { err = e; }
		});

		it("should thow an error for invalid target currency",  () => expect(result.err).to.exist );

        	before( async () => {
			    err = undefined;
			    try { result = await A.execute ("convert", { 
                    currency: "eur", 
                    target_currency: "usd", 
                    amount: "aaaa"}); 
                }
                catch(e) { err = e; }
		    });

		it("should thow an error for invalid amount",  () => expect(result.err).to.exist );

	});

    /***
	 * Action: Foreign Currency -> Euro
	 */
	describe( "Foreign Currency to Euros", async () => {

		before( async () => {

			result = await A.execute ("convert", { 
                currency: "usd", 
                target_currency: "eur", 
                amount: "1000"
            }); 

            console.log(result)

			to = Object.keys(result.rates)[0];
			from = Object.keys(result.rates)[1];
		});

       	it("should run this test ",  () => expect(1).to.equal(1) );

        
		it("should return a response object with <raw> property",  () => expect(result).to.have.property('raw') );
		it("should return a response object with <result> property",  () => expect(result).to.have.property('result') );
		it("should return a response object with <base_currency> property",  () => expect(result).to.have.property('base_currency') );
		it("should return a response object with <target_currency> property",  () => expect(result).to.have.property('target_currency') );
		it("should return a response object with <amount> property",  () => expect(result).to.have.property('amount') );
		it("should return a response object with <rates> property",  () => expect(result).to.have.property('rates') );
		it("should return a response object with <ts> property",  () => expect(result).to.have.property('ts') );

		it("should specify <amount> as number",  () => expect(!isNaN(result.amount)).to.equal(true) );
		it("should specify <raw> as number",  () => expect(!isNaN(result.raw)).to.equal(true) );
		it("should specify <result> as number",  () => expect(!isNaN(result.amount)).to.equal(true) );
		it("should specify <conversion rate > to euro as float",  () => expect(isFloat(result.rates[to])).to.equal(true) );
		it("should specify <conversion rate > from euro as float",  () => expect(isFloat(result.rates[from])).to.equal(true) );
    });

    /***
	 * Action: Foreign Currency -> Euro
	 */
	describe( "Foreign Currency to Euros", async () => {

		before( async () => {
			result = await A.execute ("convert", { 
                currency: "eur", 
                target_currency: "usd", 
                amount: "1000"
            }); 

			to = Object.keys(result.rates)[0];
			from = Object.keys(result.rates)[1];
		});

		it("should specify <amount> as number",  () => expect(!isNaN(result.amount)).to.equal(true) );
		it("should specify <raw> as number",  () => expect(!isNaN(result.raw)).to.equal(true) );
		it("should specify <result> as number",  () => expect(!isNaN(result.amount)).to.equal(true) );

		it("should specify <conversion rate> to foreign currency as float",  () => expect(isFloat(result.rates[to])).to.equal(true) );
		it("should specify <conversion rate > from foreign currency as float",  () => expect(isFloat(result.rates[from])).to.equal(true) );

	});

});

