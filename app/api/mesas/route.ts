import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData, createRecord, updateRecord, Mesa } from '@/lib/db';
import { getCurrentTimestamp } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const mesas = readData<Mesa>('mesas.json');
    return NextResponse.json(mesas);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar mesas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { numero, local, setor, coberta, capacidade, preco, x, y } = body;

    // Validações
    if (!numero || !local || !setor || coberta === undefined || !x || !y) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    const mesas = readData<Mesa>('mesas.json');
    
    // Verificar se número da mesa já existe
    if (mesas.some(m => m.numero === numero)) {
      return NextResponse.json(
        { error: 'Número da mesa já existe' },
        { status: 400 }
      );
    }

    const novaMesa = await createRecord<Mesa>('mesas.json', {
      numero,
      local,
      setor,
      coberta,
      capacidade: capacidade || 4,
      preco: preco || 1.00,
      x,
      y,
      status: 'disponivel',
      lote_id: null,
      hold_session_id: null,
      hold_expires_at: null,
      updated_at: getCurrentTimestamp()
    });

    return NextResponse.json(novaMesa, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao criar mesa' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      );
    }

    const mesaAtualizada = updateRecord<Mesa>('mesas.json', id, {
      ...updates,
      updated_at: getCurrentTimestamp()
    });

    if (!mesaAtualizada) {
      return NextResponse.json(
        { error: 'Mesa não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(mesaAtualizada);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao atualizar mesa' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      );
    }

    const { deleteRecord } = await import('@/lib/db');
    const deleted = deleteRecord('mesas.json', id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Mesa não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao deletar mesa' },
      { status: 500 }
    );
  }
}