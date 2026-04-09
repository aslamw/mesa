const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// ============================================
// CONFIGURAÇÃO DO BACK4APP
// ============================================
// IMPORTANTE: Substitua pelos seus dados!
// Como obter:
// 1. Acesse https://www.back4app.com
// 2. Vá em App Settings > Security & Keys
// 3. Copie os valores abaixo

const BACK4APP_CONFIG = {
    APP_ID: process.env.BACK4APP_APP_ID || "ptRlXeyBd8VeoPnFwMiJU9kADdlJA3J0zQ8AFTO9",
    REST_KEY: process.env.BACK4APP_REST_KEY || "i1xNyuJQyfS7YEz0CwAqQuv10lhvA3CossjRYpaV",
    MASTER_KEY: process.env.BACK4APP_MASTER_KEY || "SzBViRgjtmSQPLxBA7ARRJdhgeUdehiB4BWV69eb",
    BASE_URL: "https://parseapi.back4app.com"
};

// Headers para API do Back4App
const getHeaders = (useMasterKey = false) => {
    const headers = {
        'X-Parse-Application-Id': BACK4APP_CONFIG.APP_ID,
        'Content-Type': 'application/json'
    };
    
    if (useMasterKey && BACK4APP_CONFIG.MASTER_KEY !== "SEU_MASTER_KEY_AQUI") {
        headers['X-Parse-Master-Key'] = BACK4APP_CONFIG.MASTER_KEY;
    } else {
        headers['X-Parse-REST-API-Key'] = BACK4APP_CONFIG.REST_KEY;
    }
    
    return headers;
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Verificar se está em modo demo (credenciais não configuradas)
const isDemoMode = () => {
    return BACK4APP_CONFIG.APP_ID === "SEU_APP_ID_AQUI" || 
           BACK4APP_CONFIG.REST_KEY === "SUA_REST_KEY_AQUI";
};

// ============================================
// ROTA INICIAL
// ============================================
app.get('/', (req, res) => {
    res.json({
        nome: 'Sistema de Reserva de Mesas',
        versao: '1.0.0',
        status: 'online',
        modo: isDemoMode() ? 'DEMO (configure suas credenciais)' : 'PRODUÇÃO',
        endpoints: {
            mesas: {
                listar: 'GET /api/mesas',
                disponiveis: 'GET /api/mesas/disponiveis',
                detalhes: 'GET /api/mesas/:id'
            },
            reservas: {
                criar: 'POST /api/reservas',
                listar: 'GET /api/reservas',
                email: 'GET /api/reservas/email/:email',
                cancelar: 'DELETE /api/reservas/:id'
            },
            estatisticas: 'GET /api/estatisticas',
            admin: {
                criar_mesa: 'POST /api/admin/mesas',
                seed: 'POST /api/admin/seed'
            }
        }
    });
});

// ============================================
// ROTAS DE MESAS
// ============================================

// Listar todas as mesas
app.get('/api/mesas', async (req, res) => {
    try {
        const response = await axios.get(
            `${BACK4APP_CONFIG.BASE_URL}/classes/Mesas`,
            { headers: getHeaders() }
        );
        
        res.json({
            success: true,
            data: response.data.results || [],
            total: (response.data.results || []).length
        });
    } catch (error) {
        console.error('Erro:', error.message);
        res.json({
            success: true,
            data: [],
            total: 0,
            message: 'Nenhuma mesa encontrada. Use POST /api/admin/seed para criar mesas.'
        });
    }
});

// Listar apenas mesas disponíveis
app.get('/api/mesas/disponiveis', async (req, res) => {
    try {
        const whereClause = encodeURIComponent(JSON.stringify({ status: 'disponivel' }));
        const response = await axios.get(
            `${BACK4APP_CONFIG.BASE_URL}/classes/Mesas?where=${whereClause}`,
            { headers: getHeaders() }
        );
        
        res.json({
            success: true,
            data: response.data.results || [],
            total: (response.data.results || []).length
        });
    } catch (error) {
        res.json({ success: true, data: [], total: 0 });
    }
});

// Buscar mesa por ID
app.get('/api/mesas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const response = await axios.get(
            `${BACK4APP_CONFIG.BASE_URL}/classes/Mesas/${id}`,
            { headers: getHeaders() }
        );
        
        res.json({ success: true, data: response.data });
    } catch (error) {
        res.status(404).json({ success: false, error: 'Mesa não encontrada' });
    }
});

// ============================================
// ROTAS DE RESERVAS
// ============================================

// Criar nova reserva
app.post('/api/reservas', async (req, res) => {
    try {
        const { mesa_id, nome_cliente, email, telefone } = req.body;
        
        // Validação
        if (!mesa_id || !nome_cliente || !email || !telefone) {
            return res.status(400).json({
                success: false,
                error: 'Campos obrigatórios: mesa_id, nome_cliente, email, telefone'
            });
        }
        
        // Verificar se a mesa existe e está disponível
        const mesaResponse = await axios.get(
            `${BACK4APP_CONFIG.BASE_URL}/classes/Mesas/${mesa_id}`,
            { headers: getHeaders() }
        );
        
        const mesa = mesaResponse.data;
        
        if (mesa.status !== 'disponivel') {
            return res.status(400).json({
                success: false,
                error: 'Mesa não está disponível'
            });
        }
        
        // Criar reserva
        const reservaData = {
            mesa_id: { __type: 'Pointer', className: 'Mesas', objectId: mesa_id },
            nome_cliente,
            email,
            telefone,
            data_reserva: { __type: 'Date', iso: new Date().toISOString() },
            status: 'confirmada'
        };
        
        const reservaResponse = await axios.post(
            `${BACK4APP_CONFIG.BASE_URL}/classes/Reservas`,
            reservaData,
            { headers: getHeaders() }
        );
        
        // Atualizar status da mesa
        await axios.put(
            `${BACK4APP_CONFIG.BASE_URL}/classes/Mesas/${mesa_id}`,
            { status: 'reservada' },
            { headers: getHeaders() }
        );
        
        res.json({
            success: true,
            message: 'Reserva confirmada!',
            data: {
                reserva_id: reservaResponse.data.objectId,
                mesa: mesa.numero,
                cliente: nome_cliente
            }
        });
        
    } catch (error) {
        console.error('Erro na reserva:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'Erro ao processar reserva'
        });
    }
});

// Listar todas reservas
app.get('/api/reservas', async (req, res) => {
    try {
        const include = encodeURIComponent('mesa_id');
        const response = await axios.get(
            `${BACK4APP_CONFIG.BASE_URL}/classes/Reservas?include=${include}`,
            { headers: getHeaders() }
        );
        
        res.json({
            success: true,
            data: response.data.results || [],
            total: (response.data.results || []).length
        });
    } catch (error) {
        res.json({ success: true, data: [], total: 0 });
    }
});

// Buscar reservas por email
app.get('/api/reservas/email/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const whereClause = encodeURIComponent(JSON.stringify({ email }));
        const include = encodeURIComponent('mesa_id');
        
        const response = await axios.get(
            `${BACK4APP_CONFIG.BASE_URL}/classes/Reservas?where=${whereClause}&include=${include}`,
            { headers: getHeaders() }
        );
        
        res.json({
            success: true,
            data: response.data.results || [],
            total: (response.data.results || []).length
        });
    } catch (error) {
        res.json({ success: true, data: [], total: 0 });
    }
});

// Cancelar reserva
app.delete('/api/reservas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { mesa_id } = req.body;
        
        if (!mesa_id) {
            return res.status(400).json({
                success: false,
                error: 'mesa_id é obrigatório'
            });
        }
        
        // Deletar reserva
        await axios.delete(
            `${BACK4APP_CONFIG.BASE_URL}/classes/Reservas/${id}`,
            { headers: getHeaders() }
        );
        
        // Liberar mesa
        await axios.put(
            `${BACK4APP_CONFIG.BASE_URL}/classes/Mesas/${mesa_id}`,
            { status: 'disponivel' },
            { headers: getHeaders() }
        );
        
        res.json({ success: true, message: 'Reserva cancelada' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erro ao cancelar' });
    }
});

// ============================================
// ESTATÍSTICAS
// ============================================
app.get('/api/estatisticas', async (req, res) => {
    try {
        const [mesasRes, reservasRes] = await Promise.all([
            axios.get(`${BACK4APP_CONFIG.BASE_URL}/classes/Mesas`, { headers: getHeaders() }),
            axios.get(`${BACK4APP_CONFIG.BASE_URL}/classes/Reservas?include=mesa_id`, { headers: getHeaders() })
        ]);
        
        const mesas = mesasRes.data.results || [];
        const reservas = reservasRes.data.results || [];
        
        const totalMesas = mesas.length;
        const disponiveis = mesas.filter(m => m.status === 'disponivel').length;
        const reservadas = mesas.filter(m => m.status === 'reservada').length;
        
        let receita = 0;
        reservas.forEach(r => {
            if (r.mesa_id && r.mesa_id.preco) receita += r.mesa_id.preco;
        });
        
        res.json({
            success: true,
            data: {
                mesas: { total: totalMesas, disponiveis, reservadas },
                reservas: { total: reservas.length, receita_total: receita }
            }
        });
    } catch (error) {
        res.json({ success: true, data: { mesas: { total: 0, disponiveis: 0, reservadas: 0 }, reservas: { total: 0, receita_total: 0 } } });
    }
});

// ============================================
// ADMIN - POPULAR DADOS INICIAIS
// ============================================
app.post('/api/admin/seed', async (req, res) => {
    try {
        const mesasIniciais = [
            { numero: "01", lugares: 8, preco: 350, status: "disponivel" },
            { numero: "02", lugares: 8, preco: 350, status: "disponivel" },
            { numero: "03", lugares: 6, preco: 280, status: "disponivel" },
            { numero: "04", lugares: 6, preco: 280, status: "disponivel" },
            { numero: "05", lugares: 4, preco: 200, status: "disponivel" },
            { numero: "06", lugares: 4, preco: 200, status: "disponivel" },
            { numero: "07", lugares: 8, preco: 350, status: "disponivel" },
            { numero: "08", lugares: 6, preco: 280, status: "disponivel" },
            { numero: "09", lugares: 4, preco: 200, status: "disponivel" },
            { numero: "10", lugares: 8, preco: 350, status: "disponivel" },
            { numero: "11", lugares: 6, preco: 280, status: "disponivel" },
            { numero: "12", lugares: 4, preco: 200, status: "disponivel" }
        ];
        
        let criadas = 0;
        for (const mesa of mesasIniciais) {
            try {
                await axios.post(
                    `${BACK4APP_CONFIG.BASE_URL}/classes/Mesas`,
                    mesa,
                    { headers: getHeaders(true) }
                );
                criadas++;
            } catch (e) {}
        }
        
        res.json({
            success: true,
            message: `${criadas} mesas criadas!`,
            total: criadas
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Criar mesa individual (admin)
app.post('/api/admin/mesas', async (req, res) => {
    try {
        const { numero, lugares, preco, status = 'disponivel' } = req.body;
        
        if (!numero || !lugares || !preco) {
            return res.status(400).json({ success: false, error: 'Campos obrigatórios' });
        }
        
        const response = await axios.post(
            `${BACK4APP_CONFIG.BASE_URL}/classes/Mesas`,
            { numero, lugares, preco, status },
            { headers: getHeaders(true) }
        );
        
        res.json({ success: true, data: response.data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`
    ═══════════════════════════════════════════════════
    🚀 Servidor rodando na porta ${PORT}
    
    📌 Status: ${isDemoMode() ? '⚠️ MODO DEMO' : '✅ PRODUÇÃO'}
    
    🔗 URL: http://localhost:${PORT}
    
    📋 Endpoints principais:
    GET  /api/mesas              - Listar mesas
    GET  /api/mesas/disponiveis  - Mesas disponíveis
    POST /api/reservas           - Fazer reserva
    GET  /api/estatisticas       - Estatísticas
    POST /api/admin/seed         - Popular dados (admin)
    ═══════════════════════════════════════════════════
    `);
});

module.exports = app;