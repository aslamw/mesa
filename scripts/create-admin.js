const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function createAdmin() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  
  const admin = {
    id: uuidv4(),
    username: 'admin',
    password_hash: hash,
    ativo: true,
    created_at: new Date().toISOString()
  };
  
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(dataDir, 'gerentes.json'),
    JSON.stringify([admin], null, 2)
  );
  
  console.log('Admin criado com sucesso!');
  console.log('Username: admin');
  console.log('Password: admin123');
}

createAdmin();