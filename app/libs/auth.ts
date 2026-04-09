import bcrypt from 'bcryptjs';

const GERENTES_FILE = 'gerentes.json';

// Função para gerar hash de senha
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Função para verificar senha
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}