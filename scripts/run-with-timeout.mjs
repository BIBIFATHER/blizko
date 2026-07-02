#!/usr/bin/env node

import { spawn } from 'node:child_process';

const [rawTimeoutSeconds, command, ...args] = process.argv.slice(2);
const timeoutSeconds = Number(rawTimeoutSeconds);

if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0 || !command) {
  console.error('Usage: run-with-timeout.mjs <seconds> <command> [args...]');
  process.exit(2);
}

const child = spawn(command, args, {
  stdio: 'inherit',
  detached: process.platform !== 'win32',
});

let timedOut = false;
let forceKillTimer;

function signalChild(signal) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  try {
    if (process.platform === 'win32') child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch (error) {
    if (error?.code !== 'ESRCH') throw error;
  }
}

const timeoutTimer = setTimeout(() => {
  timedOut = true;
  console.error(`Command timed out after ${timeoutSeconds}s; terminating process group.`);
  signalChild('SIGTERM');
  forceKillTimer = setTimeout(() => signalChild('SIGKILL'), 5_000);
  forceKillTimer.unref();
}, timeoutSeconds * 1_000);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    signalChild(signal);
    process.exit(128 + (signal === 'SIGINT' ? 2 : 15));
  });
}

child.on('error', (error) => {
  clearTimeout(timeoutTimer);
  if (forceKillTimer) clearTimeout(forceKillTimer);
  console.error(`Failed to start command: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  clearTimeout(timeoutTimer);
  if (forceKillTimer) clearTimeout(forceKillTimer);
  if (timedOut) process.exit(124);
  if (typeof code === 'number') process.exit(code);
  console.error(`Command terminated by ${signal || 'unknown signal'}.`);
  process.exit(1);
});

