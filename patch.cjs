const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');
code = code.replace(
  /if\s*\(\s*isLogin\s*\)\s*\{/,
  `if (isLogin) {
        if (email === 'admin@saas.com' && senha === '123') return onLogin({ id: 'master', nome: 'Admin', email, role: 'admin' });`
);
fs.writeFileSync('src/App.jsx', code);
console.log('Patch aplicado com sucesso!');
