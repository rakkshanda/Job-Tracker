const fs = require('fs');
const path = require('path');

const url = process.env.ENV_SUPABASE_URL || '';
const key = process.env.ENV_SUPABASE_KEY || '';

const out = `window.ENV_SUPABASE_URL = ${JSON.stringify(url)};\nwindow.ENV_SUPABASE_KEY = ${JSON.stringify(key)};\n`;

fs.writeFileSync(path.join(process.cwd(), 'config.js'), out, 'utf8');
console.log('Generated config.js');

