#! /usr/bin/env node

const { program } = require('commander');
const generate = require('./generate');

program
  .command('generate')
  .description('Generate the parallel data for all applicable language codes.')
  .action(generate);

program.parse();
