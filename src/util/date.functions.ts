import moment from "moment-timezone";

interface IDateFormat {
    length: number | undefined,
    $char: string | undefined
}

export const getLengthDateString = (d: string): IDateFormat => {
      
    let l: number=1;
    let $char;
    [":", "-", "/"].forEach( (char:string) => { 
        const length:number = d.split(char).length;        
        if(length > l) {
            l = length;
            $char = char;
        }
    });   

    return { length: l, $char};
}

export const testLengthStringFormat = (d: string): void => {
    const {length, $char}:IDateFormat = getLengthDateString(d);        
    if(!length || length <= 1) throw new Error('Your query contains an invalid date string');     
}

export const isYear = (YYYY:string, currentYear:number): boolean => {
    return ( parseInt (YYYY) === currentYear);
}

export const isMonth = (_MM:string): boolean => {
    const MM = parseInt(_MM);
    return ( Number.isInteger(MM) && (MM >= 1) && (MM <= 12) );
}

export const isDay = (_DD:string): boolean => {
    const DD = parseInt(_DD);
    return ( Number.isInteger(DD) && (DD >= 1) && (DD <= 31) );
}    

export const validateDateString  = (d: string): void => {   

    const {length, $char}:IDateFormat = getLengthDateString(d);   
    
    const today:Date = new Date();
    const currentYear:number = today.getFullYear();

    // try to test date if year was left out
    if(length<=2) d = `${currentYear}${$char}${d}`;      

    const [YYYY, MM, DD ] = d.split($char);        

    if (!this.isYear(YYYY, currentYear) || !this.isMonth(MM) || !this.isDay(DD) ) {
        throw new Error("Your qeury has an invalid date")
    }       
}

export const setDefaultTimezone = ( timezone:string ): void => {
    moment.tz.setDefault ( timezone );   
}      

export const getCurrentTimestamp = ():number => {    
    return Math.round( new Date().getTime() / 1000 );         
}

export const getTargetTimestampForTimeZone = (date:string, TZ:string):number => {
    return parseInt(
        moment.tz(date, TZ).format("X")
    );
}

export const getFormattedDate= ():string => {
    const ts = Math.round( new Date().getTime() / 1000 );
    return moment.unix(ts).format("YYYY-MM-DD");   
}

export const getOffsetbetweenTimeZones = (TZ1:string, TZ2:string): number => {

    const ts = Math.round( new Date().getTime() / 1000 );
    const currentDate = moment.unix(ts).format("YYYY-MM-DD hh:mm");      

    const a:number = getTargetTimestampForTimeZone(currentDate, TZ1);
    const b:number = getTargetTimestampForTimeZone(currentDate, TZ2)   

    return (a - b);
}

export const getDateVars = (date:Date) => {
    return {
        YYYY: date.getUTCFullYear(),
        MM: date.getUTCMonth() + 1,
        DD: date.getUTCDate(),
        hh: date.getUTCHours(),
        mm: date.getUTCMinutes()
    };
}

export const defineTargetTime = (hh:number, mm:number, offset:number) => {     
    const target:Date = new Date();
    target.setHours(hh,mm,0,0);
    return (target.getTime() + offset) /1000;        
}

