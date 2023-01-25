import _ from 'lodash';

// Utility types
/** Any object whose key is string. */
export declare type Data<T=unknown> = Record<string, T>;
/** The data fetcher function */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare type DataFetcher<T=any> = (path: string) => Promise<Data<T>>;
/** The processor function */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare type Processor<T=any> = (key: string, value: T) => Promise<string>;

/**
 * Collect Data object from callback functions
 * which have the path argument.
 * 
 * @template T
 * @param {string[]} paths
 *    file paths of the target files.
 * @param {DataFetcher<T>} dataFetcher
 *    callback function to load data form a path.
 * @return {Promise<Data<T>>}
 *    Consolidated Data object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function collectData<T=any>(paths: string[], dataFetcher: DataFetcher<T>): Promise<Data<T>> {
  const items = await Promise.all(paths.map(async (path: string) => await dataFetcher(path)));
  let base: Data<T> = {};
  items.forEach((item: Data<T>) => 
    base = mergeData<T>(base, item)
  );
  return base;
}

/**
 * Execute callback functions for each Data entries.
 * 
 * @template T
 * @param {Data<T>} data 
 *    Data object to be processed.
 * @param {Processor<T>} processer
 *    callback function to process each Data entries.
 *    its arguments are key-value pair of each entry.
 *    it returns a text as the resulting message.
 * @return {Promise<string[]>}
 *    list of the resulting messages.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processData<T=any>(data: Data<T>, processer: Processor<T>): Promise<string[]> {
  return await Promise.all(Object.entries(data).map(async entry => 
    await processer(entry[0], entry[1]) // return messages for logging purpose.
  ));
}

/**
 * Get Data values as arrays.
 * 
 * @template T
 * @param {Data<T>} data 
 *    Data object to be processed.
 * @return {T[]}
 *    list of the resulting messages.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDataValues<T>(data: Data<T>):T[] {
  return Object.entries<T>(data).map(args => args[1]);
} 

/**
 * Merge two Data objects.
 * 
 * @template T
 * @param {Data<T>} from
 *    Data object to be merged.
 * @param {Data<T>} to
 *    Data object to merge.
 * @return {Data<T>}
 *    return marged Data object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeData<T>(from: Data<T>, to: Data<T>): Data<T> {
  // When arrays are merged, the latter array always wins.
  return _.mergeWith(from, to, (_a, b) => _.isArray(b) ? b : undefined );
}
