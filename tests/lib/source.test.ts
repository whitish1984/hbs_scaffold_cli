import { expect, jest, it } from '@jest/globals';
import type { Data } from '@/lib/dataOperator';


import fs from 'fs/promises';

import { tn, mapperFactory } from '#/testUtil'; 

// test targets
import * as sr from '@/lib/source';


// TEST DATA
let mockStat: jest.Mock<typeof fs.stat>;
const STAT_MAP = {
  'path/to/file.txt'                : {isFile: ()=>true,  isDirectory: ()=>false },
  'path/to/file.hbs.txt'            : {isFile: ()=>true,  isDirectory: ()=>false },
  'path/to/file.HANDLEBARS.txt'     : {isFile: ()=>true,  isDirectory: ()=>false },
  'path/to/file.handlebars.hbs.txt' : {isFile: ()=>true,  isDirectory: ()=>false },
  'path/to/file.HBS.handlebars.txt' : {isFile: ()=>true,  isDirectory: ()=>false },
  'another/to/file.txt'             : {isFile: ()=>true,  isDirectory: ()=>false },
  'path/to/.handlebars'             : {isFile: ()=>true,  isDirectory: ()=>false },
  'path/to/dir'                     : {isFile: ()=>false, isDirectory: ()=>true  },
  'path/to/broken.txt'              : {isFile: ()=>false, isDirectory: ()=>false }
};
// MockReadFile
type MockReadFile = (path: string) => Promise<string>;
let mockReadFile: jest.Mock<MockReadFile>;
const READ_MAP = {
  'path/to/invalid.hbs.txt' : '{{#if obj.check}}{{obj.value}}', // no closure.
  'path/to/blank.hbs.txt'   : '  \n',
  'path/to/empty.hbs.txt'   : '{{#unless obj.check}}{{obj.value}}{{/unless}}',
  'path/to/valid.hbs.txt'   : '{{#if obj.check}}{{obj.value}}{{/if}}'
};
// MockMkDir/MockWriteFile (return voids)
type MockMkDir = (path: string) => Promise<string>;
let mockMkDir: jest.Mock<MockMkDir>;
type MockWriteFile = (path: string, data: string) => Promise<void>;
let mockWriteFile: jest.Mock<MockWriteFile>;
// TEST DATA
const data = { name: 'start testing', obj: { check: true, value: 'test' } };
let STORE: Data<string>;

describe('sourceDataFetcherFactory', () => {

  const sourceDataFetcher = sr.sourceDataFetcherFactory('path/to/');

  beforeEach(() => {
    mockStat = jest.spyOn(fs, 'stat') as jest.Mock<typeof fs.stat>;
    mockStat.mockImplementation(path => mapperFactory(STAT_MAP)(path as string));
  });

  it(tn('throws Error', 'if no file is found at a template path.'), async () => {
    mockStat.mockRestore();
    await expect(sourceDataFetcher('path/to/not-found.txt' /* file not exist */))
      .rejects.toThrow('ENOENT');
  });

  it(tn('throws RuntimeError', 'if the template path points to a directory.'), async () => {
    await expect(sourceDataFetcher('path/to/dir'))
      .rejects.toHaveProperty('name', 'RuntimeError');
  });

  it(tn('throws RuntimeError', 'if the template file is broken.'), async () => {
    await expect(sourceDataFetcher('path/to/broken.txt'))
      .rejects.toHaveProperty('name', 'RuntimeError');
  });

  it(tn('throws RuntimeError', 'if then template file is not located inside the template directory.'), async () => {
    await expect(sourceDataFetcher('another/to/file.txt'))
      .rejects.toHaveProperty('name', 'RuntimeError');
  });

  it(tn('throws RuntimeError', 'if the template file name is invalid.'), async () => {
    await expect(sourceDataFetcher('path/to/.handlebars'))
      .rejects.toHaveProperty('name', 'RuntimeError');
  });

  it.each([
    'path/to/file.txt',
    'path/to/file.hbs.txt',
    'path/to/file.HANDLEBARS.txt',
  ])(tn('returns Data', 'if the template path is: %s.'), async (path: string) => {
    const result = await sourceDataFetcher(path);
    expect(result).toEqual({ 'file.txt': { template: path, extraData: {} } });
  });

  it(tn('returns Data', 'if the template path is: path/to/file.handlebars.hbs.txt.'), async () => {
    const result = await sourceDataFetcher('path/to/file.handlebars.hbs.txt');
    expect(result).toEqual({ 'file.hbs.txt': { template: 'path/to/file.handlebars.hbs.txt', extraData: {} } });
  });

  it(tn('returns Data', 'if the template path is: path/to/file.HBS.handlebars.txt.'), async () => {
    const result = await sourceDataFetcher('path/to/file.HBS.handlebars.txt');
    expect(result).toEqual({ 'file.handlebars.txt': { template: 'path/to/file.HBS.handlebars.txt', extraData: {} } });
  });

});

describe('collectSourcesFactory', () => {

  it(tn('returns Data', 'if the template paths are valid.'), async () => {
    mockStat = jest.spyOn(fs, 'stat') as jest.Mock<typeof fs.stat>;
    mockStat.mockImplementation(path => mapperFactory(STAT_MAP)(path as string));
    const result = await sr.collectSourcesFactory('path/to')([
      'path/to/file.hbs.txt',
      'path/to/file.handlebars.hbs.txt'
    ]);
    expect(result).toStrictEqual({
      'file.txt': { template: 'path/to/file.hbs.txt', extraData: {} },
      'file.hbs.txt': { template: 'path/to/file.handlebars.hbs.txt', extraData: {} }
    });
  });

});

describe('sourceProcesserFactory', () => {
 
  beforeEach(() => {
    STORE = { writeFile: '', mkdir: '' };
    mockReadFile = jest.spyOn(fs, 'readFile') as jest.Mock<MockReadFile>;
    mockReadFile.mockImplementation(path => mapperFactory<string>(READ_MAP)(path));
    mockWriteFile = jest.spyOn(fs, 'writeFile') as jest.Mock<MockWriteFile>;
    mockWriteFile.mockImplementation((_path, data) => {
      STORE.writeFile = data;
      return Promise.resolve();
    });
    mockMkDir = jest.spyOn(fs, 'mkdir') as jest.Mock<MockMkDir>;
    mockMkDir.mockImplementation((path) => 
      Promise.resolve(STORE.mkdir = path)
    );
  });

  it(tn('skip to generate with WARN', 'if output file is being overwritten by the output file.'), async () => {
    const sourceProcesser = sr.sourceProcesserFactory('./out', data, '', ['out/to/overwritten.txt']);
    const result = await sourceProcesser('to/overwritten.txt', { template: 'path/to/data.hbs.yaml', extraData: {} });
    expect(mockMkDir).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(result).toMatch(/^WARN:.*'out\/to\/overwritten.txt'/);
  });

  it(tn('throws Error', 'if template file is not found.'), async () => {
    mockReadFile.mockRestore();
    const sourceProcesser = sr.sourceProcesserFactory('./out', data, '', []);
    await expect(sourceProcesser('to/not-found.txt', { template: 'path/to/not-found.hbs.txt', extraData: {} }))
      .rejects.toThrow('ENOENT');
    expect(mockMkDir).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it(tn('throws Error', 'if template file is invalid.'), async () => {
    const sourceProcesser = sr.sourceProcesserFactory('./out', data, '', []);
    await expect(sourceProcesser('to/invalid.txt', { template: 'path/to/invalid.hbs.txt', extraData: {} }))
      .rejects.toThrow('Parse error');
    expect(mockMkDir).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it(tn('skip to generate with WARN', 'if template file is blank.'), async () => {
    const sourceProcesser = sr.sourceProcesserFactory('./out', data, '', []);
    const result = await sourceProcesser('to/blank.txt', { template: 'path/to/blank.hbs.txt', extraData: {} });
    expect(mockMkDir).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(result).toMatch(/^WARN:.*'out\/to\/blank.txt'/);
  });

  it(tn('skip to generate with WARN', 'if genereated string become empty.'), async () => {
    const sourceProcesser = sr.sourceProcesserFactory('./out', data, '', []);
    const result = await sourceProcesser('to/empty.txt', { template: 'path/to/empty.hbs.txt', extraData: {} });
    expect(mockMkDir).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(result).toMatch(/^WARN:.*'out\/to\/empty.txt'/);
  });

  it(tn('throws Error', 'if Error is occured at preparing output dir(s).'), async () => {
    mockMkDir.mockRejectedValue(new Error('Manually triggered.'));
    const sourceProcesser = sr.sourceProcesserFactory('./out', data, '', []);
    await expect(sourceProcesser('to/valid.txt', { template: 'path/to/valid.hbs.txt', extraData: {} }))
      .rejects.toThrow('Manually triggered');
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it(tn('throws Error', 'if Error is occured at file output.'), async () => {
    mockWriteFile.mockRejectedValue(new Error('Manually triggered.'));
    const sourceProcesser = sr.sourceProcesserFactory('./out', data, '', []);
    await expect(sourceProcesser('to/valid.txt', { template: 'path/to/valid.hbs.txt', extraData: {} }))
      .rejects.toThrow('Manually triggered');
    expect(STORE.mkdir).toBe('out/to');
  });

  it(tn('generates a file', 'if arguments set well.'), async () => {
    const sourceProcesser = sr.sourceProcesserFactory('./out', data, '//prepend\n', []);
    const result = await sourceProcesser('to/valid.txt', { template: 'path/to/valid.hbs.txt', extraData: {} });
    expect(STORE).toEqual({ writeFile: '//prepend\ntest', mkdir: 'out/to'});
    expect(result).toBe('out/to/valid.txt');
  });

  it(tn('generates a file', 'if the extra Data object exists.'), async () => {
    const sourceProcesser = sr.sourceProcesserFactory('./out', data, '', []);
    const result = await sourceProcesser('to/valid.txt', { template: 'path/to/valid.hbs.txt', extraData: {obj: {value: 1234}} });
    expect(STORE).toEqual({ writeFile: '1234', mkdir: 'out/to'});
    expect(result).toBe('out/to/valid.txt');
  });

});

describe('processSourceFactory', () => {

  it(tn('generates a file', 'if arguments set well.'), async () => {
    mockReadFile = jest.spyOn(fs, 'readFile') as jest.Mock<MockReadFile>;
    mockReadFile.mockImplementation(path => mapperFactory<string>(READ_MAP)(path));
    mockWriteFile = jest.spyOn(fs, 'writeFile') as jest.Mock<MockWriteFile>;
    mockMkDir = jest.spyOn(fs, 'mkdir') as jest.Mock<MockMkDir>;
    const processSource = sr.processSourceFactory('./out', data, '//prepend\n', []);
    const result = await processSource({
      'to/empty.txt': { template: 'path/to/empty.hbs.txt', extraData: {}},
      'to/valid.txt': { template: 'path/to/valid.hbs.txt', extraData: {obj: {value: 1234}} }
    });
    expect(result).toStrictEqual(['out/to/empty.txt', 'out/to/valid.txt']);
  });

});