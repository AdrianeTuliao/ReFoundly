// Usage:  node add-theme.js <folder-with-your-html-files>
// Adds  <script src="theme.js"></script>  to every .html file's <head> (skips files that already have it).
// A backup copy of each changed file is saved as <name>.html.bak
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || '.';
const TAG = '    <script src="theme.js"></script>\n';
let changed = 0, skipped = 0;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!e.name.endsWith('.html')) continue;
    let s = fs.readFileSync(p, 'utf8');
    if (s.includes('theme.js') || !/<\/head>/i.test(s)) { skipped++; continue; }
    fs.writeFileSync(p + '.bak', s);
    fs.writeFileSync(p, s.replace(/<\/head>/i, TAG + '</head>'));
    console.log('updated', p); changed++;
  }
})(dir);
console.log(`Done: ${changed} updated, ${skipped} skipped`);