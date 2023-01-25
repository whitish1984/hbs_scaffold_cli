import { expect, jest, it } from '@jest/globals';

import Handlebars from 'handlebars';
import p from 'path';

import { tn, requireFromString } from '#/testUtil'; 

// test targets
import * as ch from '@/lib/customHelper';

describe('helpersDataFetcher', () => {

  it(tn('throws Error', 'if the module file is not found.'), async () => {
    await expect(ch.helpersDataFetcher('path/to/not-found.txt' /* file not exist */))
      .rejects.toThrow('Cannot find module');
  });

  it(tn('throws Error', 'if the module file is invalid.'), async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    jest.mock(p.resolve('path/to/broken.js'), () => requireFromString('var test = ";'), {virtual: true});
    await expect(ch.helpersDataFetcher('path/to/broken.js'))
      .rejects.toThrow();
  });

  it(tn('returns empty Data', 'if the module file doesn\'t have any function.'), async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    jest.mock(p.resolve('path/to/empty.js'), () => requireFromString('var test = "";'), {virtual: true});
    const result = await ch.helpersDataFetcher('path/to/empty.js');
    expect(result).toEqual({});
  });

  it(tn('returns Data', 'if the module file is valid.'), async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    jest.mock(p.resolve('path/to/valid.js'), () => requireFromString(`
      module.exports.first = function(arr) { return arr[0]; };
      function last(arr) { return arr[arr.length - 1]; }
      module.exports.last = last;
    `), {virtual: true});
    const result = await ch.helpersDataFetcher('path/to/valid.js');
    expect(result.first(['one','two','three'])).toBe('one');
    expect(result.last(['one','two','three'])).toBe('three');
  });

});

describe('collectHelpers', () => {

  it(tn('returns Data', 'if the module files are valid.'), async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    jest.mock(p.resolve('path/to/valid1.js'), () => requireFromString(`
      module.exports.first = function(arr) { return arr[0]; };
    `), {virtual: true});
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    jest.mock(p.resolve('path/to/valid2.js'), () => requireFromString(`
      function last(arr) { return arr[arr.length - 1]; }
      module.exports.last = last;
    `), {virtual: true});
    const result = await ch.collectHelpers(['path/to/valid1.js', 'path/to/valid2.js']);
    expect(result.first(['one','two','three'])).toBe('one');
    expect(result.last(['one','two','three'])).toBe('three');
  });

});

describe('registerHelperProcesserFactory', () => {

  it(tn('register helper functions to multiple Handlebars object', 'if the helpers are valid.'), async () => {
    const Handlebars1 = Handlebars.create();
    const result1 = await ch.registerHelperProcesserFactory(Handlebars1)('first', (arr: string[])=>arr[0]);
    const Handlebars2 = Handlebars.create();
    const result2 = await ch.registerHelperProcesserFactory(Handlebars2)('last', (arr: string[])=>arr[arr.length - 1]);
    expect(result1).toBe('first');
    expect(result2).toBe('last');
    expect(Handlebars1.helpers['first'](['one','two','three'])).toBe('one');
    expect(Handlebars1.helpers['last']).toBeUndefined();
    expect(Handlebars2.helpers['first']).toBeUndefined();
    expect(Handlebars2.helpers['last'](['one','two','three'])).toBe('three');
  });

});

describe('processRegisterHelpersFactory', () => {

  it(tn('register helper functions', 'if the helpers are valid.'), async () => {
    const result = await ch.processRegisterHelpersFactory(Handlebars)({
      first: (arr: string[])=>arr[0],
      last: (arr: string[])=>arr[arr.length - 1]
    });
    expect(result).toStrictEqual(['first', 'last']);
    expect(Handlebars.helpers['first'](['one','two','three'])).toBe('one');
    expect(Handlebars.helpers['last'](['one','two','three'])).toBe('three');
  });

});
