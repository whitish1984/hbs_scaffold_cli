/**
 * Create new Error and return it.
 * Support function to set Error name easily.
 * 
 * @param {string} name
 *    the error name.
 * @param {string} message
 *    The error message.
 * @return {Error} Error object..
 */
export function exception(name: string, message: string): Error {
  const e = new Error;
  e.name = name;
  e.message = message;
  return e;
}