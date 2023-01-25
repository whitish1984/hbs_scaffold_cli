import { expect, jest, it } from '@jest/globals';

import p from 'path';

import { tn, mapperFactory } from '#/testUtil'; 

// test & mock targets
import * as util from '@/bin/cliUtil';

describe('getArray', () => {

  it(tn('returns an empty array', 'if input value is object.'), () => {
    const result = util.getStringArray({ first: 'test', second: false });
    expect(result).toEqual([]);
  });

  it(tn('returns an empty array', 'if the input value is neither object nor string.'), () => {
    const result = util.getStringArray(true);
    expect(result).toEqual([]);
  });

  it(tn('returns an array includes a element', 'if the input value is string.'), () => {
    const result = util.getStringArray('value-0');
    expect(result).toEqual(['value-0']);
  });

  it(tn('returns an empty array', 'if the input value is empty array.'), () => {
    const result = util.getStringArray([]);
    expect(result).toEqual([]);
  });

  it(tn('returns an array containing a element', 'if the input value has a string element.'), () => {
    const result = util.getStringArray(['value-0', Symbol(), true, null, ()=>true, {} ]);
    expect(result).toEqual(['value-0']);
  });

  it(tn('returns an array containing elements', 'if the input value has string elements.'), () => {
    const result = util.getStringArray(['value-0', 'value-1']);
    expect(result).toEqual(['value-0', 'value-1']);
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
