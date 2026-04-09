import { NextRequest, NextResponse } from 'next/server';
import { getRecord, Mesa } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mesa = getRecord<Mesa>('mesas.json', params.id);
    
    if (!mesa) {
      return NextResponse.json(
        { error: 'Mesa não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(mesa);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar mesa' },
      { status: 500 }
    );
  }
}