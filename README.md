# Handlebars CLI for scaffolding

This is a command line tool to render [handlebars](https://handlebarsjs.com/) templates applying static YAML/JSON data, 
designed mainly for scaffolding: the tool can render multiple templates and make their directory structure at one time.

It's worked on nodejs.

## How to install

There are 2 options to install this tool.

### Use nodejs

```sh
# global install
$ npm i -g hbs-scaffold-cli
$ hbs -h

# local install
$ npm i hbs-scaffold-cli
$ npx hbs -h

# one time usage
$ npx hbs-scaffold-cli -h
```

see: https://www.npmjs.com/package/hbs-scaffold-cli

### Use docker image

```sh
$ docker run --rm whitish1984/hbs-scaffold-cli -h
```

see: https://hub.docker.com/r/whitish1984/hbs-scaffold-cli

## Usage

```txt
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
      By default, the longest common path for all templates is applied.

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
  * Template file names and their directory structure can be dynamically controlled with 
    ".brueprint" definition. For more detail, Please refer to README in github project
  * Environment variables can always be used for input data with _env object
    (e.g. _env.(environment variable name)).
  * In additon to the environment variables, JSON or YAML data can be used 
    as input with -i/--input option.
```

## How to use `.blueprint`

`.blueprint` approach is useful if you face a complex case: 
if you need to conditionally branch/loop the generating files, dynamically rename directories/files etc.

You can design how to generate output files with handlebars syntax in the `.blueprint` file. 
Following custom helpers can be used only in the `.blueprint` file.
 * `render` helper: Generate output file with output path, template file to be applied and additional input data(optional).
 * `preload` helper: Set preload file with the file path.

You can use the above helpers in conbination with any other usual helpers (e.g. `if`/`each` helpers). 

### Example

Directory tree:

```txt
./
 |- data.yaml
 `- tmpl/
     |- .blueprint
     |- tmpl1.hbs <-- Handlebars template
     `- tmpl2.hbs <-- Handlebars template
```

`./data.yaml`:

```yaml
check: true
dirname: path/to
elements: 
  - foo
  - bar
  - baz
```

`./tmpl/.brueprint`:

``` handlebars
{{#if check}}
  {{render './tmpl/tmpl1.hbs' './file.txt' }}
{{/if}}
{{#each elements as |el|}}
  {{#render './tmpl/tmpl2.hbs'~}}
    ./{{../dirname}}/{{el}}.txt
  {{~/render}}
{{/each}}
```
With above setup, if you execute following command at `./`,

```sh
$ hbs -i './data.yaml' './tmpl/.blueprint' './out'
```

output file will be:

```txt
./
 |- ...
 `- out/
     |- file.txt <-- ./tmpl/tmpl1.hbs
     `- path/
         `- to/
             |- foo.txt <-- ./tmpl/tmpl2.hbs
             |- bar.txt <-- ./tmpl/tmpl2.hbs
             `- baz.txt <-- ./tmpl/tmpl2.hbs
```

## How to use custom helper

You can create custom handlebars helpers as js modules and load these modules at runtime. 
Exported functions are only be taken into account (e.g. exported class is ignored), and the function name is straightforwardly used for the helper name.

### Example

custom js file:

```js
export function concat (...args) {
  const options = args.pop();
  if (options.fn !== undefined) {
    throw Error('Wrong usage!!');
  }
  return args.join('');
}
```

You can use above helper in a template and a `.blueprint`.

```handlebars
{{concat '1' '2' '3'}} <-- become '123'
```
## How to use preload

You can prepend a common template string for any generating with prepend option.
Typical usage is assumed for inline partials.

### Example

`./tmpl/partial.hbs`:

``` handlebars
{{#*inline 'greeting'}}
Hello World!!
{{/inline}}
```

`./tmpl/foo.hbs`:

``` handlebars
{{> 'greetings'}}
```

With above setup, if you execute following command at `./`,

```sh
$ hbs -p './tmpl/partial.hbs' './tmpl/foo.hbs' './out'
```

output file: ./out/foo will be:

```txt
Hello World!!
```
