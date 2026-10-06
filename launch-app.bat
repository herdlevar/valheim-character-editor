@echo off
title Valheim Character Editor
cd /d "%~dp0"
start "" /b node node_modules\electron\cli.js .
exit
