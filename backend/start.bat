@echo off
start /B "" "C:\Program Files\nodejs\node.exe" -r dotenv/config dist/server.js dotenv_config_path=.env.production
