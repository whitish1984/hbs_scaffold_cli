import { expect, jest, it } from '@jest/globals';
import type { Data } from '@/lib/util';

import p from 'path';

import { tn, mapperFactory, expected } from '#/testUtil'; 

// test & mock targets
import * as util from '@/lib/util';

describe('getArray', () => {

  it(tn('returns an empty array', 'if no prperty exists in the object.'), () => {
    const result = util.getArray({}, 'first');
    expect(result).toEqual([]);
  });

  it(tn('returns an empty array', 'if specified property is undifined.'), () => {
    const result = util.getArray({ second: 'test' }, 'first');
    expect(result).toEqual([]);
  });

  it(tn('returns an empty array', 'if specified property is function.'), () => {
    const result = util.getArray({ first: () => 'first', second: null }, 'first');
    expect(result).toEqual([]);
  });

  it(tn('returns an empty array', 'if specified property is symbol.'), () => {
    const result = util.getArray({ first: Symbol(), second: null }, 'first');
    expect(result).toEqual([]);
  });

  it(tn('returns an empty array', 'if specified property is null.'), () => {
    const result = util.getArray<string>({ first: null, second: 'test' }, 'first');
    expect(result).toEqual([]);
  });

  it(tn('returns an array includes a element', 'if specified property is single value.'), () => {
    const result = util.getArray({ first: 'value-0', second: null, get: () => null }, 'first');
    expect(result).toEqual(['value-0']);
  });

  it(tn('returns an empty array', 'if it exists at the specified property.'), () => {
    const result = util.getArray({ first: [], second: null, get: () => null }, 'first');
    expect(result).toEqual([]);
  });

  it(tn('returns an array containing a element', 'if it exists at the specified property.'), () => {
    const result = util.getArray<string>({ first: ['value-0'], second: null, get: () => null }, 'first');
    expect(result).toEqual(['value-0']);
  });

  it(tn('returns an array containing elements', 'if it exists at the specified property.'), () => {
    const result = util.getArray<string>({ first: ['value-0', 'value-1'], second: null, get: () => null }, 'first');
    expect(result).toEqual(['value-0', 'value-1']);
  });

});

describe('mergeData', () => {

  // TEST DATA
  const valid1 = { bool: true, number: 123, string: 'path/to/target.txt', array: [ 'a', 'b' ], fn: ()=>'test', children: { array: [ 456, false, 'z' ], number: 123, fn: ()=>'test'}};
  const valid2 = { bool: false, string: 'path/to/target.yaml', string1: 'path/to/target1.txt', fn: (test: string)=>test, children: { array: [ 456, false ], number: 456, bool: true }};
  const merged = { bool: false, number: 123, string: 'path/to/target.yaml', string1: 'path/to/target1.txt', array: [ 'a', 'b' ], fn: (test: string)=>test, children: { array: [ 456, false ], number: 456, fn: ()=>'test', bool: true }};

  it(tn('returns empty Data.', 'if input objects are empty.'), () => {
    const result = util.mergeData({}, {});
    expect(result).toEqual({});
  });
  
  it(tn('returns Data', 'if former input is empty.'), () => {
    const result = util.mergeData({}, valid1);
    expect(result).toEqual(expected(valid1));
    expect((result.fn as () => string)()).toBe('test');
    expect(((result.children as Data).fn as () => string)()).toBe('test');  
  });

  it(tn('returns Data', 'if latter input is empty.'), () => {
    const result = util.mergeData(valid1, {});
    expect(result).toEqual(expected(valid1));
    expect((result.fn as () => string)()).toBe('test');
    expect(((result.children as Data).fn as () => string)()).toBe('test');  
  });

  it(tn('returns merged Data', 'if both inputs are not empty.'), () => {
    const result = util.mergeData(valid1, valid2);
    expect(result).toEqual(expected(merged));
    expect((result.fn as (test: string) => string)('test')).toBe('test');
    expect(((result.children as Data).fn as () => string)()).toBe('test');  
  });

});

describe('naturalCast', () => {

  // TEST DATA
  const fn = () => true;
  const condition = {
    null: null, nullStr: 'null',
    bool: true, boolStr: 'true',
    number: 123, numberStr: '123',
    array: ['test', true, 456], arrayStr: '["test", true, 456]', 
    child: { bool: false, boolStr: 'false', fn: fn },
    objectStr: '{ "one": true, "two": 456, "three": "test" }',
    invalid: '{ "one": true "two": 456, "three": "test" }' // comma missing.
  };
  const expected = {
    null: null, nullStr: null,
    bool: true, boolStr: true,
    number: 123, numberStr: 123,
    objectStr: { one: true, two: 456, three: 'test' },
    array: ['test', true, 456], arrayStr: ['test', true, 456], 
    child: { bool: false, boolStr: false, fn: fn },
    invalid: '{ "one": true "two": 456, "three": "test" }' // keep as it is.
  };

  it(tn('returns naturally casted Data', 'if a Data is processed.'), () => {
    const result = util.naturalCast(condition);
    expect(result).toEqual(expected);
  });

});

describe('resolveGlobs', () => {

  // TEST DATA
  let mockFg: jest.Mock<typeof util.fg>;
  const MAP_FG = {
    'path/to/empty/**' : [],
    'path/to/test.txt' : ['path/to/test.txt'],
    'path/to/test.*'   : ['path/to/test.json', 'path/to/test.txt', 'path/to/test.yaml'],
    'path/to/*.json'   : ['path/to/test.json', 'path/to/test.0.json', 'path/to/test.1.json']
  };

  beforeEach(() => {
    mockFg = jest.spyOn(util, 'fg') as jest.Mock<typeof util.fg>;
    mockFg.mockImplementation(path => mapperFactory<string[]>(MAP_FG)(path as string));
  });

  it(tn('throws Error', 'if fg throws Error.'), async () => {
    mockFg.mockRejectedValue(new Error('Manually triggered.'));
    await expect(util.resolveGlobs(['**'], { dot: true }))
      .rejects.toThrow('Manually triggered.');
  });

  it(tn('throws RuntimeError', 'if no files matches an input pattern.'), async () => {
    await expect(util.resolveGlobs(['path/to/test.txt', 'path/to/empty/**']))
      .rejects.toHaveProperty('name', 'RuntimeError');
  });
  
  it(tn('returns a path in array', 'if a file matches an input pattern.'), async () => {
    const result = await util.resolveGlobs(['path/to/test.txt']);
    expect(result).toEqual(['path/to/test.txt']);
  });

  it(tn('returns paths in array', 'if files matches an input pattern.'), async () => {
    const result = await util.resolveGlobs(['path/to/test.*']);
    expect(result).toEqual(['path/to/test.json', 'path/to/test.txt', 'path/to/test.yaml']);
  });

  it(tn('returns paths in array', 'if files matches multiple input patterns.'), async () => {
    const result = await util.resolveGlobs(['path/to/test.txt', 'path/to/test.*', 'path/to/*.json']);
    expect(result).toEqual(['path/to/test.0.json', 'path/to/test.1.json', 'path/to/test.json', 'path/to/test.txt', 'path/to/test.yaml']);
  });

});

describe('getPrefixPath', () => {

  it(tn('returns empty', 'if input path array is empty.'), () => {
    expect(util.getPrefixPath([])).toBe('');
  });

  it(tn('returns parent dirname of a path', 'if input path array contains a path.'), () => {
    expect(util.getPrefixPath(['a/b/c/d.txt'])).toBe(p.resolve('a/b/c'));
    expect(util.getPrefixPath(['a/b/c/'])).toBe(p.resolve('a/b'));
  });

  it(tn('returns longest common prefix among paths', 'if input path array contains paths.'), () => {
    expect(util.getPrefixPath([
      p.resolve('a/b/c/d/e.txt'), 
      'a/b/c/f/', 
      'a/b/d.txt',
      'a/b/d/../c/g.txt',
    ])).toBe(p.resolve('a/b'));
  });

});

describe('exception', () => {
  it(tn('returns Error object', 'if argument set well.'), () => {
    const result = util.exception('name test', 'message test');
    expect(result).toHaveProperty('name', 'name test');
    expect(result).toHaveProperty('message', 'message test');
  });
});
