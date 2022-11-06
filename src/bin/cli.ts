#!/usr/bin/env node
import type { Args, Result } from '@/lib/main'; 

import minimist from 'minimist';
import p from 'path';

import { run } from '@/lib/main';
import { getAsArray, resolveGlobs, getPrefixPath, exception } from '@/lib/util';

const errorPostScript = '\n\nPlease check hbs -h for more detail.';

function showUsage() {
  console.log(`
Generate files from handlebars templates.

  Usage: 
    hbs -h
    hbs [option] <template_path1> (<template_path2> ...) <output_dir>

  Arguments:
    template_path: 
      Path of handlebars template files.
      Wildcard(*) can be used and "**" matched any files or directories 
      located at any depth (same convention of .gitignore).
      At least, one of this argument MUST set.
    output_dir: 
      Root directory path to locate the generated files.
      This argument MUST set.

  Options:
    --input(-i) <path>
      Input data file paths (JSON or YAML).
      Wildcard(*) can be used and "**" matched any files or directories 
      located at any depth (same convention of .gitignore).

    --custom-helper(-c) <path>
      File path of custom helper js. 
      Please refer to README in github project how to develop the custom helper.
      Wildcard(*) can be used and "**" matched any files or directories 
      located at any depth (same convention of .gitignore).

    --preload(-p) <path>
      Template files to be preloaded for each generation.
      Please refer to README in github project how to use preload.
      Wildcard(*) can be used and "**" matched any files or directories 
      located at any depth (same convention of .gitignore).

    --template-root <path>
      Root path of template files. 
      Each relative path from the root to a template file is used for a output file path.
      By default, the longest common path of all template files is applied.

    --verbose(-v)
      Print detailed result at standard output.

    --help(-h)
      Print this usage.

  Function details: 
  * Each generated file path becomes:
      (output_dir)/(relative path from the template root to a template file).
    Please refer to '--template-root' option for the detail of template root.
  * If a template file includes .handlebars or .hbs extension in its name,
    such extensions are removed from the output file.
  * Template file name and its directories can be dynamically specified with 
    ".brueprint" definition. For more detail, Please refer to README in github project
  * Environment variables can always be used for input data with _env object
    (e.g. _env.(environment variable name)).
  * In additon to the environment variables, JSON or YAML data can be used 
    as input with -i/--input option.

  GitHub Project:
    https://github.com/whitish1984/hbs_scaffold_cli`
  );
}

function getParsedArgs(process: NodeJS.Process): minimist.ParsedArgs {
  return minimist(process.argv.slice(2), {
    string: [ 'input', 'custom-helper', 'preload', 'template-root' ],
    boolean: [ 'help', 'verbose' ],
    alias: {
      'input': 'i',
      'custom-helper': 'c',
      'preload': 'p',
      'verbose': 'v',
      'help': 'h'
    },
    unknown: (arg) => {
      if (arg.startsWith('-')) {
        throw exception('CLIError', `Unknown option: '${arg}'.${errorPostScript}`);
      }
      return true;
    }
  });
}

async function cli(proc: NodeJS.Process) {
  // Provide a title to the process in `ps`
  proc.title = 'hbs';

  // Process arguments
  const minimistArgs = getParsedArgs(proc);
  
  // Print usage
  if (minimistArgs.help) {
    showUsage();
    proc.exit(0);
  }
  
  // Validate / data collection
  if (minimistArgs._.length<2) {
    throw exception('CLIError', `a template_path and output_dir is mandatiory.${errorPostScript}`);
  }
  const templates: string[] = await resolveGlobs(minimistArgs._.slice(0, minimistArgs._.length-1));

  const args = {
    templateDir: (minimistArgs['template-root'] as string)??getPrefixPath(templates),
    outputDir: minimistArgs._[minimistArgs._.length-1],
    templates: templates.filter(path => p.basename(path) !== '.blueprint'),
    blueprints: templates.filter(path => p.basename(path) === '.blueprint'),
    inputs: await resolveGlobs(getAsArray<string>(minimistArgs, 'input'), { dot: true }),
    preloads: await resolveGlobs(getAsArray<string>(minimistArgs, 'preload'), { dot: true }),
    customHelpers: await resolveGlobs(getAsArray<string>(minimistArgs, 'custom-helper'), { dot: true })
  };

  // Run
  const result: Result = await run(args as Args);
  if (minimistArgs['verbose']){
    if (args.customHelpers.length > 0) {
      console.log(
        '\nFollowing custom helpers are registerred:\n'
        + '  * ' + result.registerdHelpers.join('\n  * ')
      );
    }
    console.log('\nInput data is consolidated as followings:');
    console.dir(result.consolidatedData);
    console.log('\nGenerated files:\n' + result.generatedFiles.join('\n'));  
  }
  else {
    const numSkipped = result.generatedFiles.filter(value => value.startsWith('WARN')).length;
    const numProcessed = result.generatedFiles.length - numSkipped;
    console.log(`${numProcessed} files are generated (${numSkipped} files are skipped).`);
  }
  proc.exit();
}

cli(process).catch((e: unknown) => {
  if (e instanceof Error) {
    console.log(`${e.name}: ${e.message}`);
    process.exit(1);
  }
});
