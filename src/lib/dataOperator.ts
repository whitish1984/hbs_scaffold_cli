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
    base = mergeData(base, item) as Data<T>
  );
  return base;
}

/**
 * Execute callback functions for each Data entries.
 * 
 * @template T
 * @param {Data<T>} data 
 *    Data object to be processed.
 * @param {Processor} processer
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

export function getValues<T>(data: Data<T>):T[] {
  return Object.entries<T>(data).map(args => args[1]);
} 

/**
 * Merge two Data objects.
 * 
 * @param {Data} from
 *    Data object to be merged.
 * @param {Data} to
 *    Data object to merge.
 * @return {Data}
 *    return marged Data object.
 */
export function mergeData(from: Data, to: Data): Data {
  // When arrays are merged, the latter array always wins.
  return _.mergeWith(from, to, (_a, b) => _.isArray(b) ? b : undefined );
}
