import { NextRequest, NextResponse } from 'next/server';
import { readData, createRecord, Gerente } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { getCurrentTimestamp } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const gerentes = readData<Gerente>('gerentes.json');
    const gerentesSemSenha = gerentes.map(({ password_hash, ...gerente }) => gerente);
    return NextResponse.json(gerentesSemSenha);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar gerentes' },
      { status: 500 }
    );
  }
}

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
    
    if (gerentes.some(g => g.username === username)) {
      return NextResponse.json(
        { error: 'Username já existe' },
        { status: 400 }
      );
    }

    const password_hash = await hashPassword(password);

    const novoGerente = await createRecord<Gerente>('gerentes.json', {
      username,
      password_hash,
      ativo: true,
      created_at: getCurrentTimestamp()
    });

    const { password_hash: _, ...gerenteSemSenha } = novoGerente;

    return NextResponse.json(gerenteSemSenha, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao criar gerente' },
      { status: 500 }
    );
  }
}