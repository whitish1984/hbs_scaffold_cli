import { expect, jest, it } from '@jest/globals';
import type { Data } from '@/lib/util';

import Handlebars from 'handlebars';

import { tn, mapperFactory } from '#/testUtil'; 

// test targets
import * as pr from '@/lib/processor';
// mock targets
import fs from 'fs/promises';
import * as df from '@/lib/dataFetcher';

describe('processData', () => {

  // TEST DATA
  type MockProcessor = (key: string, value: number) => Promise<string>
  const testProcessor = jest.fn<MockProcessor>();

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    testProcessor.mockImplementation((key, _value) => Promise.resolve(key));
  });
  
  it(tn('throws Error','if processor throws Error.'), async () => {
    testProcessor.mockRejectedValue(new Error('Manually triggered.'));
    await expect(pr.processData({ one: 1 }, testProcessor))
      .rejects.toThrow('Manually triggered.');
  });

  it(tn('doesn\'t execute the processor', 'if Data is empty.'), async () => {
    const result = await pr.processData({}, testProcessor);
    expect(result).toEqual([]);
    expect(testProcessor).not.toHaveBeenCalled();
  });

  it(tn('executes the processor once', 'if Data has a entry.'), async () => {
    const result = await pr.processData({ one: 1 }, testProcessor);
    expect(result).toEqual(['one']);
    expect(testProcessor).toHaveBeenCalledTimes(1);
  });

  it(tn('executes the processor multiple times', 'if Data has a entry.'), async () => {
    const result = await pr.processData({ one: 1, two: 2, three: 3 }, testProcessor);
    expect(result).toEqual(['one', 'two', 'three']);
    expect(testProcessor).toHaveBeenCalledTimes(3);
  });

});

describe('registerHelperProcesser', () => {

  it(tn('register helper function', 'if arguments set well.'), async () => {
    await pr.registerHelperProcesser('invalidFunction', ()=>true);
    expect(Handlebars.helpers).toMatchObject({ invalidFunction: expect.any(Function) });
  });

});

describe('generateProcesserFactory', () => {

  // MOCKS (return values)
  type MockReadFile = (path: string) => Promise<string>;
  let mockReadFile: jest.Mock<MockReadFile>;
  let mookGetInputPaths: jest.Mock<typeof df.getInputPaths>;
  // MOCKS (return voids)
  type MockMkDir = (path: string) => Promise<string>;
  type MockWriteFile = (path: string, data: string) => Promise<void>;
  let mockMkDir: jest.Mock<MockMkDir>;
  let mockWriteFile: jest.Mock<MockWriteFile>;
  // TEST DATA
  const data = { name: 'start testing', obj: { check: true, value: 'test' } };
  const MAP = {
    'path/to/invalid.hbs.txt' : '{{#if obj.check}}{{obj.value}}', // no closure.
    'path/to/brank.hbs.txt'   : '  \n',
    'path/to/empty.hbs.txt'   : '{{#unless obj.check}}{{obj.value}}{{/unless}}',
    'path/to/valid.hbs.txt'   : '{{#if obj.check}}{{obj.value}}{{/if}}'
  };
  const generateProcesser = pr.generateProcesserFactory('./out', data);
  let STORE: Data<string>;
 
  beforeEach(() => {
    STORE = { writeFile: '', mkdir: '' };
    // MOCKS (return values)
    mockReadFile = jest.spyOn(fs, 'readFile') as jest.Mock<MockReadFile>;
    mockReadFile.mockImplementation(path => mapperFactory<string>(MAP)(path));
    mookGetInputPaths = jest.spyOn(df, 'getInputPaths') as jest.Mock<typeof df.getInputPaths>;
    mookGetInputPaths.mockReturnValue(['out/to/data.yaml', 'out/to/helper.js']);
    // MOCKS (return voids)
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

  it(tn('skip to generate with WARN', 'if output file is being overwritten an input file.'), async () => {
    const result = await generateProcesser('to/data.yaml', { template: 'path/to/data.hbs.yaml', extraData: {} });
    expect(mockMkDir).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(result).toMatch(/^WARN:.*'out\/to\/data.yaml'/);
  });

  it(tn('throws Error', 'if template file is not found.'), async () => {
    mockReadFile.mockRestore();
    await expect(generateProcesser('to/not-found.txt', { template: 'path/to/not-found.hbs.txt', extraData: {} }))
      .rejects.toThrow('ENOENT');
    expect(mockMkDir).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it(tn('throws Error', 'if template file is invalid.'), async () => {
    await expect(generateProcesser('to/invalid.txt', { template: 'path/to/invalid.hbs.txt', extraData: {} }))
      .rejects.toThrow('Parse error');
    expect(mockMkDir).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it(tn('skip to generate with WARN', 'if template file is blank.'), async () => {
    const result = await generateProcesser('to/brank.txt', { template: 'path/to/brank.hbs.txt', extraData: {} });
    expect(mockMkDir).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(result).toMatch(/^WARN:.*'out\/to\/brank.txt'/);
  });

  it(tn('skip to generate with WARN', 'if genereated string become empty.'), async () => {
    const result = await generateProcesser('to/empty.txt', { template: 'path/to/empty.hbs.txt', extraData: {} });
    expect(mockMkDir).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(result).toMatch(/^WARN:.*'out\/to\/empty.txt'/);
  });

  it(tn('throws Error', 'if Error is occured at preparing output dir(s).'), async () => {
    mockMkDir.mockRejectedValue(new Error('Manually triggered.'));
    await expect(generateProcesser('to/valid.txt', { template: 'path/to/valid.hbs.txt', extraData: {} }))
      .rejects.toThrow('Manually triggered');
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it(tn('throws Error', 'if Error is occured at file output.'), async () => {
    mockWriteFile.mockRejectedValue(new Error('Manually triggered.'));
    await expect(generateProcesser('to/valid.txt', { template: 'path/to/valid.hbs.txt', extraData: {} }))
      .rejects.toThrow('Manually triggered');
    expect(STORE.mkdir).toBe('out/to');
  });

  it(tn('generates a file', 'if arguments/inputs set well.'), async () => {
    const result = await generateProcesser('to/valid.txt', { template: 'path/to/valid.hbs.txt', extraData: {} });
    expect(STORE).toEqual({ writeFile: 'test', mkdir: 'out/to'});
    expect(result).toBe('out/to/valid.txt');
  });

  it(tn('generates a file', 'if extra Data object exist.'), async () => {
    const result = await generateProcesser('to/valid.txt', { template: 'path/to/valid.hbs.txt', extraData: {obj: {value: 1234}} });
    expect(STORE).toEqual({ writeFile: '1234', mkdir: 'out/to'});
    expect(result).toBe('out/to/valid.txt');
  });

});
