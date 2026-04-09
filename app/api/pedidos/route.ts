import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData, createRecord, updateRecord, PedidoLote, PedidoMesa, Mesa, Cliente } from '@/lib/db';
import { generateCodigo, getCurrentTimestamp } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const pedidos = readData<PedidoLote>('pedidos_lote.json');
    const pedidosComDetalhes = pedidos.map(pedido => {
      const pedidoMesas = readData<PedidoMesa>('pedido_mesas.json')
        .filter(pm => pm.pedido_id === pedido.id);
      const cliente = readData<Cliente>('clientes.json')
        .find(c => c.id === pedido.cliente_id);
      
      return {
        ...pedido,
        cliente,
        mesas: pedidoMesas
      };
    });
    
    return NextResponse.json(pedidosComDetalhes);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar pedidos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cliente_id, mesas_ids, payment_method } = body;

    if (!cliente_id || !mesas_ids || !mesas_ids.length || !payment_method) {
      return NextResponse.json(
        { error: 'Cliente, mesas e método de pagamento são obrigatórios' },
        { status: 400 }
      );
    }

    const mesas = readData<Mesa>('mesas.json');
    const mesasSelecionadas = mesas.filter(m => mesas_ids.includes(m.id));
    
    if (mesasSelecionadas.length !== mesas_ids.length) {
      return NextResponse.json(
        { error: 'Algumas mesas não foram encontradas' },
        { status: 400 }
      );
    }

    // Verificar disponibilidade das mesas
    const mesasIndisponiveis = mesasSelecionadas.filter(m => m.status !== 'disponivel');
    if (mesasIndisponiveis.length > 0) {
      return NextResponse.json(
        { error: 'Algumas mesas não estão disponíveis', mesas: mesasIndisponiveis },
        { status: 400 }
      );
    }

    const total = mesasSelecionadas.reduce((sum, mesa) => sum + mesa.preco, 0);
    const codigo = generateCodigo();

    // Criar pedido lote
    const novoPedido = await createRecord<PedidoLote>('pedidos_lote.json', {
      codigo,
      cliente_id,
      status: 'em_analise',
      payment_method,
      payment_status: 'pendente',
      total,
      created_at: getCurrentTimestamp()
    });

    // Criar pedido_mesas e atualizar status das mesas
    const pedidoMesasCriados = [];
    for (const mesa of mesasSelecionadas) {
      const pedidoMesa = await createRecord<PedidoMesa>('pedido_mesas.json', {
        pedido_id: novoPedido.id,
        mesa_id: mesa.id,
        preco: mesa.preco,
        status: 'em_analise',
        updated_at: getCurrentTimestamp()
      });
      pedidoMesasCriados.push(pedidoMesa);

      // Atualizar status da mesa
      updateRecord<Mesa>('mesas.json', mesa.id, {
        status: 'em_analise',
        lote_id: novoPedido.id,
        updated_at: getCurrentTimestamp()
      });
    }

    return NextResponse.json({
      pedido: novoPedido,
      mesas: pedidoMesasCriados
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao criar pedido' },
      { status: 500 }
    );
  }
}