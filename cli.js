#!/usr/bin/env node
'use strict';
const {URL} = require('url');
const meow = require('meow');
const speedtest = require('speedtest-net');
const updateNotifier = require('update-notifier');
const roundTo = require('round-to');
const chalk = require('chalk');
const logUpdate = require('log-update');
const logSymbols = require('log-symbols');
const Ora = require('ora');

const cli = meow(`
	Usage
	  $ speed-test

	Options
	  --json -j     Output the result as JSON
	  --bytes -b    Output the result in megabytes per second (MBps)
	  --verbose -v  Output more detailed information
`, {
	flags: {
		json: {
			type: 'boolean',
			alias: 'j'
		},
		bytes: {
			type: 'boolean',
			alias: 'b'
		},
		verbose: {
			type: 'boolean',
			alias: 'v'
		}
	}
});

updateNotifier({pkg: cli.pkg}).notify();

const stats = {
	ping: '',
	download: '',
	upload: ''
};

let state = 'ping';
const spinner = new Ora();
const unit = cli.flags.bytes ? 'MBps' : 'Mbps';
const multiplier = 1;

const getSpinnerFromState = inputState => inputState === state ? chalk.gray.dim(spinner.frame()) : '  ';

const logError = error => {
	if (cli.flags.json) {
		console.error(JSON.stringify({error}));
	} else {
		console.error(logSymbols.error, error);
	}
};

function render() {
	if (cli.flags.json) {
		console.log(JSON.stringify(stats));
		return;
	}

	let output = `
      Ping ${getSpinnerFromState('ping')}${stats.ping}`;

	logUpdate(output);
}

function setState(newState) {
	state = newState;

	if (newState && newState.length > 0) {
		stats[newState] = chalk.yellow(`0 ${chalk.dim(unit)}`);
	}
}

function map(server) {
	server.host = new URL(server.url).host;
	server.location = server.name;
	server.distance = server.dist;
	return server;
}

const st = speedtest({maxTime: 20000});

if (!cli.flags.json) {
	setInterval(render, 50);
}

st.once('testserver', server => {
	if (cli.flags.verbose) {
		stats.data = {
			server: map(server)
		};
	}

	setState('download');
	const ping = Math.round(server.bestPing);
	stats.ping = cli.flags.json ? ping : chalk.cyan(ping + chalk.dim(' ms'));
});

st.on('data', data => {
	if (cli.flags.verbose) {
		stats.data = data;
	}

	render();
});

st.on('done', () => {
	console.log();
	process.exit();
});
