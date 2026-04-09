import { NextRequest, NextResponse } from 'next/server';
import { readData, createRecord, Cliente } from '@/lib/db';
import { getCurrentTimestamp } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cpf = searchParams.get('cpf');
    
    let clientes = readData<Cliente>('clientes.json');
    
    if (cpf) {
      clientes = clientes.filter(c => c.cpf === cpf);
    }
    
    return NextResponse.json(clientes);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar clientes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, cpf, telefone } = body;

    if (!nome || !cpf || !telefone) {
      return NextResponse.json(
        { error: 'Nome, CPF e telefone são obrigatórios' },
        { status: 400 }
      );
    }

    const clientes = readData<Cliente>('clientes.json');
    
    // Verificar se CPF já existe
    if (clientes.some(c => c.cpf === cpf)) {
      return NextResponse.json(
        { error: 'CPF já cadastrado' },
        { status: 400 }
      );
    }

    const novoCliente = await createRecord<Cliente>('clientes.json', {
      nome,
      cpf,
      telefone,
      created_at: getCurrentTimestamp()
    });

    return NextResponse.json(novoCliente, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao criar cliente' },
      { status: 500 }
    );
  }
}