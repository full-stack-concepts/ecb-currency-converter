import path from "path";
import { stat, readFile  } from "fs";
import { readFile as readJSON, writeFile } from "jsonfile";
import { promisify } from "util";
import { v4 as uuid} from "uuid";
import { sprintf, vsprintf } from 'sprintf-js';
import validator from "validator";
import nodemailer from "nodemailer";
import smtpTransport from "nodemailer-smtp-transport";


import { MAIL, MY_TIME_ZONE } from "../util/secrets";
import { IEmailMessage, ISystemTemplateData } from "../interfaces";
import { TEmailMessage } from "./mail/types";
import { getFormattedDate, getTargetTimestampForTimeZone } from "../util/date.functions"
import { of } from "rxjs";


const appRoot = require("app-root-path");

const [ $stat, $readFile, $readJSON ]= [  stat, readFile, readJSON  ].map(promisify);

class Emailer {

    private transporter: any;
    private smtpOptions: any;
    private defaultMessage: any;
    private message: any;

    constructor() {			      

		this.setDefaultSmtpOptions();		
    }

    private _unescape(template: string) { return validator.unescape(template.toString()); }

	private async testTemplate(html:string) {        
        let HTML:string = this._unescape(html);       
        return (typeof (HTML) === 'string') ? Promise.resolve() : Promise.reject('<errorNumber>');        
    }
    
    private setDefaultSmtpOptions() {

        this.smtpOptions = {
            service: MAIL.MAIL_SERVICE,
            auth: {
                user: MAIL.SMTP_AUTH_USER,
                pass: MAIL.SMTP_AUTH_PASSWORD
            },     
            secure: MAIL.SMTP_SECURE,
            ingnoreTLS: MAIL.SMTP_IGNORE_TLS,
            requireTLS: MAIL.SMTP_REQUIRE_TLS      
        };      
    }

	private createTransporter() { 		
		this.transporter = nodemailer.createTransport(
			smtpTransport(this.smtpOptions)
        );	       
    }  

	private async verifyTransport() {
        return new Promise((resolve, reject) => {           
            this.transporter.verify((err: Error, success: any) => {
                (err) ? reject(err) : resolve( success );
            });
        });
    }

	private async sendEmail( message: IEmailMessage ) {
        return new Promise((resolve, reject) => {
            this.transporter.sendMail( message, (err:Error, result:any) => {
                (err) ? reject(err) : resolve({ result });
            });
        });
    }
 
    public async process(message:IEmailMessage) {    

        let err:Error,
            result:any;

        try {            

            // create transport
            this.createTransporter(); 

            // verify provider
            await this.verifyTransport();
          
            // test template
            await this.testTemplate(message.html);                
            
            // send email
            result = await this.sendEmail( message);                     
        }        
        catch(e) { err = e; }
        finally {                 
            return (err) ? err: result;
        }
    }   
}


class Controller {

    /***
     * Default Event error id
     */
    private SYSTEM_ERROR_EVENT:string = "system.error";

    private rootPath:string = appRoot.path.toString();

    public async send( email:IEmailMessage) {
        const mailer = new Emailer();
        await mailer.process(email);
    }	
	private templateFilePath($file:string): string { 
        return path.join( this.rootPath, 'src', 'controllers', 'mail', 'templates', `${$file}.tpl`);	
    }

    private eventFilePath($eventID:string): string {
        return path.join( this.rootPath, 'src', 'controllers', 'mail', 'events', `${$eventID}.json`);	
    }

    private async getTemplateFile(templateID:string):Promise<string> {		   
        const $file = this.templateFilePath(templateID);	        
        const tpl:string = await $readFile($file, 'utf8');    
		return tpl;
    }

    private async getEvent( eventID: string): Promise<ISystemTemplateData> {
        const $file = this.eventFilePath(eventID);	      
        const event:ISystemTemplateData = await $readJSON($file, 'utf8');    
        return event;
    }

    /***
     * Default data for email
     * @date: Date
     * @ts: timestamp in ms
     * @email: string - default system email
     * @application: string
     */
    private formatDefaultFeed(): ISystemTemplateData {

        const date:string = getFormattedDate();
        const ts: number = getTargetTimestampForTimeZone( date, MY_TIME_ZONE);

        return  {
            date: date,
            time: ts,
            email: MAIL.SYSTEM_ADMIN_EMAIL,
            application: MAIL.APPLICATION_NAME,
            from: MAIL.SYSTEM_ADMIN_EMAIL,
            sender: MAIL.SYSTEM_ADMIN_EMAIL,
            replyTo: MAIL.SYSTEM_ADMIN_EMAIL,
            to: MAIL.SYSTEM_ADMIN_EMAIL,
        };    
    }

    /****
	 * Merges <defaultEventDefinition> with loaded specific <eventDefinition>
	 */
	private async getDataDefinition( id:string): Promise<ISystemTemplateData> {	        
    
        let defaultDefinition:ISystemTemplateData = this.formatDefaultFeed();

        let eventDefinition: ISystemTemplateData = await this.getEvent(id);

        const templateDefinition:ISystemTemplateData = Object.assign(defaultDefinition, eventDefinition);		

        return templateDefinition;
    } 

   	/***
	 * @tpl: string - raw sprintf template
	 * @definition:ISystemTemplateData - data object to be merged with raw sprintf template
	 */
	private parseTemplate(
		tpl:string, 
		definition:ISystemTemplateData
	):Promise<string> {
		
		let err:Error;
		let parsedTemplate:any;

		try { parsedTemplate = sprintf(tpl, definition );	}
		catch(e) { err = e; }
		finally {
			return new Promise( (resolve, reject) => (err)?reject(err):resolve(parsedTemplate) );
		}
    }
    
    /***
	 *
	 */
	private formatMessage(	
		definition:ISystemTemplateData,
        html:string='',
        message?:string
	):Promise<IEmailMessage> {

        // clone default message object
		let email:IEmailMessage = JSON.parse(JSON.stringify((TEmailMessage)));
		let err:Error;	

		try {

			/***
			 * Creatse unique identifier for this message
			 */
			email.messageId = uuid();

			/***
			 * Email address of the sender
			 */
			(definition.from)? email.from = definition.from : null;

			/***
             * Email address that will appear on the <Sender> field
             */
            (definition.sender)? email.sender = definition.sender : null;

            /***
             * Email address that will appear on the <Reply-To> field
             */
            (definition.replyTo)? email.replyTo = definition.replyTo: null;

            /***
             * Comma separated list or an array of recipients email addresses 
             */
            (definition.to)? email.to = definition.to : null;

            /***
             * Allow service to send email with empty subject line
             */
            (definition.subject)? email.subject = definition.subject : email.subject = "";

            /***
             * Set error message of provided
             */
            (message)? email.subject = message : null;

            /***
             * Assign HTML
             */
            email.html = html;                      

		}

		catch(e) { err = e; }

		finally {			
			return new Promise( (resolve, reject) => {
				(err)? reject(err):resolve(email);
			});
        }        
    }

    private mergeErrorMessage( msg: string ): string {
        const defaultStr: string = " An error occured when trying to download historical and current conversion rates from the European Central Bank. Please check your logs for more information. Error: "
        return `${defaultStr}${msg}`;
    }

    public async sendErrorEmail(  { message }: any) {	

        const templateID:string =  "system.data.daily.reload";
        const eventID:string = "system.error";

         // get template source file
         const tpl: string = await this.getTemplateFile(templateID);    

         // get template data definition
         const definition:ISystemTemplateData  = await this.getDataDefinition(eventID);              

        // merge error message
        definition.message = this.mergeErrorMessage( message);

         // parse data object into HTML
         const html:string = await this.parseTemplate(tpl, definition);		      
         
         // create message object for forked mailer app
         const email:IEmailMessage = await this.formatMessage(definition, html, message );

          // send email
          const Mailer:Emailer = new Emailer();    

          const result = await Mailer.process(email);

          return result;

    }

    
    public async sendSystemEmail( { eventID }: any) {	

        console.log(" Incoming data ", eventID)

        const templateID:string =  "system.data.daily.reload";
        if(!eventID) eventID = this.SYSTEM_ERROR_EVENT;

        try {

            // get template source file
            const tpl: string = await this.getTemplateFile(eventID);    

            // get template data definition
            const definition:ISystemTemplateData  = await this.getDataDefinition(eventID);              
        
            // parse data object into HTML
            const html:string = await this.parseTemplate(tpl, definition);		      
            
            // create message object for forked mailer app
            const email:IEmailMessage = await this.formatMessage(definition, html );

            // send email
            const Mailer:Emailer = new Emailer();    

            const result = await Mailer.process(email);

            return result;
        }

        // #TODO: log result
        catch(e) {
            console.log(e);
        }
    }
}

export class EmailController {
    static async exec ( action:string, {...args}:any ):Promise<any> {      
        const controller:Controller = new Controller();    
        const result = await controller[action]({...args});    
        return result;
    }
}