/***
 * 
 */
export const waitFor = (ms:Number) => new Promise(r => setTimeout(r, ms));

export const asyncForEach = async (array:any[], callback:Function) => {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}