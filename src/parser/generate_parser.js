#!/usr/bin/env node
/*
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: miha@reciprocitylabs.com
    Maintained By: miha@reciprocitylabs.com
*/

/*
Script used to generate ggrc_filter_query_parser.js

-- updating dev enviroment by running:

  vagrant provision

-- manual dev env setup:

to run this script you need node.js and peg.js
  sudo apt-get install nodejs npm
  npm install pegjs
  npm install mkdirp

if npm install returns a 404 just run the next command and try again.
  npm config set registry http://registry.npmjs.org/

then edit the parser.pegjs file and run the generator
  ./generate_parser.js

to run the tests first install nodeunit
  npm install -g nodeunit

and run with the test folder
  nodeunit test

*/

var parserSrc;
var ggrcParser;
var parserGrammar = '/vagrant/src/parser/parser.pegjs';
var parserTemplateFile = '/vagrant/src/parser/parser_template.js';
var ggrcParserFolder = '/vagrant/src/ggrc/assets/javascripts/generated/';
var ggrcParserJsFile = 'ggrc_filter_query_parser.js';
var peg = require('pegjs');
var fs = require('fs');
var mkdirp = require('mkdirp');
var parserString = fs.readFileSync(parserGrammar, 'utf8');
var filterTemplate = fs.readFileSync(parserTemplateFile, 'utf8');

// dirty way of making the parser work in node.js without jquery
root.jQuery = {
  unique: function (k) {
    return Object.keys(
      k.reduce(function (o, v, i) {
        o[v] = true;
        return o;
      }, {})
    );
  },
  type: function (o) {
    return typeof o;
  }
};

console.log('building parser');
peg.buildParser(parserString);
parserSrc = peg.buildParser(parserString, {output: 'source'});

console.log('saving parser to js files');
ggrcParser = filterTemplate.replace('"GENERATED_PLACEHOLDER"', parserSrc);

mkdirp.sync(ggrcParserFolder);
fs.writeFileSync(ggrcParserFolder + ggrcParserJsFile, ggrcParser);

console.log('\ndone :)');
