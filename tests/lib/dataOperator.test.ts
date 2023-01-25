import { expect, jest, it } from '@jest/globals';
import type { Data } from '@/lib/dataOperator';
import type { FunctionLike } from 'jest-mock';

import { tn, mapperFactory, expected } from '#/testUtil'; 

// test targets
import * as operator from '@/lib/dataOperator';

describe('collectData', () => {

  // TEST DATA
  const testDataFetcher = mapperFactory<Data>({
    'path/to/1': { a: 1, b: 2 },
    'path/to/2': { b: 3, c: 4 },
    'path/to/3': {}
  });

  it(tn('throws Error', 'if dataFetcher throws Error.'), async () => {
    const paths = [ 'path/to/1', 'path/to/not-found' /*not exist*/ ];
    await expect(operator.collectData(paths, testDataFetcher))
      .rejects.toThrow();
  });

  it(tn('returns empty Data', 'if the path array is empty.'), async () => {
    const result = await operator.collectData([], testDataFetcher);
    expect(result).toEqual({});
  });

  it(tn('returns empty Data', 'if the dataFetcher returns empty.'), async () => {
    const result = await operator.collectData([ 'path/to/3' ], testDataFetcher);
    expect(result).toEqual({});
  });

  it(tn('returns Data', 'if dataFetcher returns Data with a path.'), async () => {
    const result = await operator.collectData([ 'path/to/1' ], testDataFetcher);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it(tn('returns merged Data', 'if the dataFetcher returns multiple Data with paths.'), async () => {
    const result = await operator.collectData([ 'path/to/1', 'path/to/2', 'path/to/3' ], testDataFetcher);
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

});

describe('processData', () => {

  // TEST DATA
  type MockProcessor = (key: string, value: number) => Promise<string>
  const testProcessor = jest.fn<MockProcessor>();

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    testProcessor.mockImplementation((key, _value) => Promise.resolve(key));
  });
  
  it(tn('throws Error', 'if the processor throws Error.'), async () => {
    testProcessor.mockRejectedValue(new Error('Manually triggered.'));
    await expect(operator.processData({ one: 1 }, testProcessor))
      .rejects.toThrow('Manually triggered.');
  });

  it(tn('doesn\'t execute the processor', 'if the Data is empty.'), async () => {
    const result = await operator.processData({}, testProcessor);
    expect(result).toEqual([]);
    expect(testProcessor).not.toHaveBeenCalled();
  });

  it(tn('executes the processor once', 'if the Data has a entry.'), async () => {
    const result = await operator.processData({ one: 1 }, testProcessor);
    expect(result).toEqual(['one']);
    expect(testProcessor).toHaveBeenCalledTimes(1);
  });

  it(tn('executes the processor multiple times', 'if the Data has multiple entries.'), async () => {
    const result = await operator.processData({ one: 1, two: 2, three: 3 }, testProcessor);
    expect(result).toEqual(['one', 'two', 'three']);
    expect(testProcessor).toHaveBeenCalledTimes(3);
  });

});

describe('getDataValues', () => {

  // TEST DATA
  const anyCase = { bool: true, number: 123, string: 'path/to/target.txt', array: [ 'a', 'b' ], fn: ()=>'test', children: { array: [ 456, false, 'z' ], number: 123, fn: ()=>'test'}};
  const expectedAnyCase = [true, 123, 'path/to/target.txt', [ 'a', 'b' ], ()=>'test', { array: [ 456, false, 'z' ], number: 123, fn: ()=>'test'}];

  it(tn('returns empty array.', 'if the Data is empty.'), () => {
    const result = operator.getDataValues({});
    expect(result).toEqual([]);
  });

  it(tn('returns values as array.', 'if the Data has entries.'), () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = operator.getDataValues<any>(anyCase);
    expect(result).toEqual(expected(expectedAnyCase));
    expect((result[4] as FunctionLike)()).toBe('test'); 
  });

});

describe('mergeData', () => {

  // TEST DATA
  const valid1 = { bool: true, number: 123, string: 'path/to/target.txt', array: [ 'a', 'b' ], fn: ()=>'test', children: { array: [ 456, false, 'z' ], number: 123, fn: ()=>'test'}};
  const valid2 = { bool: false, string: 'path/to/target.yaml', string1: 'path/to/target1.txt', fn: (test: string)=>test, children: { array: [ 456, false ], number: 456, bool: true }};
  const merged = { bool: false, number: 123, string: 'path/to/target.yaml', string1: 'path/to/target1.txt', array: [ 'a', 'b' ], fn: (test: string)=>test, children: { array: [ 456, false ], number: 456, fn: ()=>'test', bool: true }};

  it(tn('returns empty Data.', 'if input objects are empty.'), () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = operator.mergeData<any>({}, {});
    expect(result).toEqual({});
  });
  
  it(tn('returns Data', 'if the former input is empty.'), () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = operator.mergeData<any>({}, valid1);
    expect(result).toEqual(expected(valid1));
    expect((result.fn as () => string)()).toBe('test');
    expect(((result.children as Data).fn as () => string)()).toBe('test');  
  });

  it(tn('returns Data', 'if the latter input is empty.'), () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = operator.mergeData<any>(valid1, {});
    expect(result).toEqual(expected(valid1));
    expect((result.fn as () => string)()).toBe('test');
    expect(((result.children as Data).fn as () => string)()).toBe('test');  
  });

  it(tn('returns merged Data', 'if the both inputs are not empty.'), () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = operator.mergeData<any>(valid1, valid2);
    expect(result).toEqual(expected(merged));
    expect((result.fn as (test: string) => string)('test')).toBe('test');
    expect(((result.children as Data).fn as () => string)()).toBe('test');  
  });

});