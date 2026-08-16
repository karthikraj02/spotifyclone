const fs = require('fs');
const path = require('path');

const replacements = [
  { regex: /#121212/ig, replacement: 'var(--bg-primary)' },
  { regex: /rgba\(18,\s*18,\s*18/ig, replacement: 'rgba(var(--bg-secondary-rgb, 24, 24, 24)' }, // Wait, converting to CSS vars in rgba is tricky, maybe I shouldn't mess with rgba
  { regex: /#181818/ig, replacement: 'var(--bg-secondary)' },
  { regex: /#282828/ig, replacement: 'var(--bg-tertiary)' },
  { regex: /#3E3E3E/ig, replacement: 'var(--bg-elevated)' },
  { regex: /#ffffff|#fff(?![\w])/ig, replacement: 'var(--text-primary)' },
  { regex: /#B3B3B3/ig, replacement: 'var(--text-secondary)' },
  { regex: /#727272/ig, replacement: 'var(--text-muted)' },
  { regex: /rgba\(255,\s*255,\s*255,\s*0\.1\)/ig, replacement: 'var(--border-color)' }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (stat.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.scss')) && !fullPath.includes('styles.scss')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      for (const rule of replacements) {
        if (rule.regex.test(content)) {
          content = content.replace(rule.regex, rule.replacement);
          changed = true;
        }
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'src', 'app'));
console.log('Refactoring complete.');
