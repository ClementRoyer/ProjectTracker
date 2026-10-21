import { runCli } from './cli';

void runCli(process.argv.slice(2), process.env, process.cwd()).then((result) => {
  if (result.out !== '') process.stdout.write(`${result.out}\n`);
  if (result.err !== '') process.stderr.write(`${result.err}\n`);
  process.exitCode = result.code;
});
