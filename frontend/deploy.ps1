if (Test-Path "frontend") { cd frontend }
npm i
npm audit fix
npm run build:prod
firebase deploy --only hosting
