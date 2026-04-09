import { NextRequest, NextResponse } from 'next/server';
import { readData, Gerente } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username e password são obrigatórios' },
        { status: 400 }
      );
    }

    const gerentes = readData<Gerente>('gerentes.json');
    const gerente = gerentes.find(g => g.username === username && g.ativo);

    if (!gerente) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, gerente.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Não retornar o hash da senha
    const { password_hash, ...gerenteSemSenha } = gerente;

    return NextResponse.json({
      success: true,
      gerente: gerenteSemSenha
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}