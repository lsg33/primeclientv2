:start
@echo off
npx tsc
node --no-warnings build/index.js
@echo on
goto start
