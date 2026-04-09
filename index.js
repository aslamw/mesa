const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurações do Back4App
const BACK4APP_CONFIG = {
    appId: process.env.BACK4APP_APP_ID,
    restKey: process.env.BACK4APP_REST_KEY,
    masterKey: process.env.BACK4APP_MASTER_KEY,
    baseUrl: process.env.BACK4APP_URL || 'https://parseapi.back4app.com'
};

// Headers para API do Back4App
const getHeaders = (useMasterKey = false) => {
    return {
        'X-Parse-Application-Id': BACK4APP_CONFIG.appId,
        'X-Parse-REST-API-Key': BACK4APP_CONFIG.restKey,
        ...(useMasterKey && { 'X-Parse-Master-Key': BACK4APP_CONFIG.masterKey }),
        'Content-Type': 'application/json'
    };
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================
// ROTAS PÚBLICAS
// ============================================

// Rota inicial
app.get('/', (req, res) => {
    res.json({
        nome: 'Sistema de Reserva de Mesas - Backend',
        versao: '1.0.0',
        status: 'online',
        endpoints: {
            mesas: {
                listar: 'GET /api/mesas',
                disponiveis: 'GET /api/mesas/disponiveis',
                detalhes: 'GET /api/mesas/:id',
                criar: 'POST /api/admin/mesas (admin)'
            },
            reservas: {
                criar: 'POST /api/reservas',
                listar: 'GET /api/reservas',
                buscarPorEmail: 'GET /api/reservas/email/:email',
                cancelar: 'DELETE /api/reservas/:id'
            },
            estatisticas: 'GET /api/estatisticas'
        }
    });
});

// ========== ROTAS DE MESAS ==========

// Listar todas as mesas
app.get('/api/mesas', async (req, res) => {
    try {
        const response = await axios.get(`${BACK4APP_CONFIG.baseUrl}/classes/Mesas`, {
            headers: getHeaders()
        });
        
        res.json({
            success: true,
            data: response.data.results,
            total: response.data.results.length
        });
    } catch (error) {
        console.error('Erro ao listar mesas:', error.message);
        res.status(500).json({
            success: false,
            error: 'Erro ao carregar mesas',
            details: error.message
        });
    }
});

// Listar apenas mesas disponíveis
app.get('/api/mesas/disponiveis', async (req, res) => {
    try {
        const whereClause = encodeURIComponent(JSON.stringify({ status: 'disponivel' }));
        const response = await axios.get(
            `${BACK4APP_CONFIG.baseUrl}/classes/Mesas?where=${whereClause}`,
            { headers: getHeaders() }
        );
        
        res.json({
            success: true,
            data: response.data.results,
            total: response.data.results.length
        });
    } catch (error) {
        console.error('Erro ao listar mesas disponíveis:', error.message);
        res.status(500).json({
            success: false,
            error: 'Erro ao carregar mesas disponíveis'
        });
    }
});

// Buscar mesa por ID
app.get('/api/mesas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const response = await axios.get(
            `${BACK4APP_CONFIG.baseUrl}/classes/Mesas/${id}`,
            { headers: getHeaders() }
        );
        
        res.json({
            success: true,
            data: response.data
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            error: 'Mesa não encontrada'
        });
    }
});

// ========== ROTAS DE RESERVAS ==========

// Criar nova reserva
app.post('/api/reservas', async (req, res) => {
    try {
        const { mesa_id, nome_cliente, email, telefone } = req.body;
        
        // Validar campos obrigatórios
        if (!mesa_id || !nome_cliente || !email || !telefone) {
            return res.status(400).json({
                success: false,
                error: 'Todos os campos são obrigatórios: mesa_id, nome_cliente, email, telefone'
            });
        }
        
        // Verificar se a mesa existe e está disponível
        const mesaResponse = await axios.get(
            `${BACK4APP_CONFIG.baseUrl}/classes/Mesas/${mesa_id}`,
            { headers: getHeaders() }
        );
        
        const mesa = mesaResponse.data;
        
        if (mesa.status !== 'disponivel') {
            return res.status(400).json({
                success: false,
                error: 'Esta mesa não está disponível para reserva'
            });
        }
        
        // Criar a reserva
        const reservaData = {
            mesa_id: {
                __type: 'Pointer',
                className: 'Mesas',
                objectId: mesa_id
            },
            nome_cliente,
            email,
            telefone,
            data_reserva: { __type: 'Date', iso: new Date().toISOString() },
            status: 'confirmada'
        };
        
        const reservaResponse = await axios.post(
            `${BACK4APP_CONFIG.baseUrl}/classes/Reservas`,
            reservaData,
            { headers: getHeaders() }
        );
        
        // Atualizar status da mesa para reservada
        await axios.put(
            `${BACK4APP_CONFIG.baseUrl}/classes/Mesas/${mesa_id}`,
            { status: 'reservada' },
            { headers: getHeaders() }
        );
        
        res.json({
            success: true,
            message: 'Reserva confirmada com sucesso!',
            data: {
                reserva_id: reservaResponse.data.objectId,
                mesa: mesa.numero,
                cliente: nome_cliente,
                email: email
            }
        });
        
    } catch (error) {
        console.error('Erro ao criar reserva:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'Erro ao processar reserva',
            details: error.response?.data?.error || error.message
        });
    }
});

// Listar todas as reservas
app.get('/api/reservas', async (req, res) => {
    try {
        const include = encodeURIComponent('mesa_id');
        const response = await axios.get(
            `${BACK4APP_CONFIG.baseUrl}/classes/Reservas?include=${include}`,
            { headers: getHeaders() }
        );
        
        res.json({
            success: true,
            data: response.data.results,
            total: response.data.results.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao listar reservas'
        });
    }
});

// Buscar reservas por email
app.get('/api/reservas/email/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const whereClause = encodeURIComponent(JSON.stringify({ email }));
        const include = encodeURIComponent('mesa_id');
        
        const response = await axios.get(
            `${BACK4APP_CONFIG.baseUrl}/classes/Reservas?where=${whereClause}&include=${include}`,
            { headers: getHeaders() }
        );
        
        res.json({
            success: true,
            data: response.data.results,
            total: response.data.results.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar reservas'
        });
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
        
        // Deletar a reserva
        await axios.delete(
            `${BACK4APP_CONFIG.baseUrl}/classes/Reservas/${id}`,
            { headers: getHeaders() }
        );
        
        // Liberar a mesa
        await axios.put(
            `${BACK4APP_CONFIG.baseUrl}/classes/Mesas/${mesa_id}`,
            { status: 'disponivel' },
            { headers: getHeaders() }
        );
        
        res.json({
            success: true,
            message: 'Reserva cancelada com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao cancelar reserva'
        });
    }
});

// ========== ROTAS DE ESTATÍSTICAS ==========

app.get('/api/estatisticas', async (req, res) => {
    try {
        // Buscar todas as mesas
        const mesasResponse = await axios.get(
            `${BACK4APP_CONFIG.baseUrl}/classes/Mesas`,
            { headers: getHeaders() }
        );
        
        // Buscar todas as reservas
        const reservasResponse = await axios.get(
            `${BACK4APP_CONFIG.baseUrl}/classes/Reservas?include=mesa_id`,
            { headers: getHeaders() }
        );
        
        const mesas = mesasResponse.data.results;
        const reservas = reservasResponse.data.results;
        
        const totalMesas = mesas.length;
        const mesasDisponiveis = mesas.filter(m => m.status === 'disponivel').length;
        const mesasReservadas = mesas.filter(m => m.status === 'reservada').length;
        
        let receitaTotal = 0;
        reservas.forEach(reserva => {
            if (reserva.mesa_id && reserva.mesa_id.preco) {
                receitaTotal += reserva.mesa_id.preco;
            }
        });
        
        // Reservas por dia (últimos 7 dias)
        const reservasPorDia = {};
        const hoje = new Date();
        
        for (let i = 0; i < 7; i++) {
            const data = new Date(hoje);
            data.setDate(hoje.getDate() - i);
            const dataStr = data.toISOString().split('T')[0];
            reservasPorDia[dataStr] = 0;
        }
        
        reservas.forEach(reserva => {
            if (reserva.data_reserva && reserva.data_reserva.iso) {
                const dataReserva = new Date(reserva.data_reserva.iso).toISOString().split('T')[0];
                if (reservasPorDia[dataReserva] !== undefined) {
                    reservasPorDia[dataReserva]++;
                }
            }
        });
        
        res.json({
            success: true,
            data: {
                mesas: {
                    total: totalMesas,
                    disponiveis: mesasDisponiveis,
                    reservadas: mesasReservadas,
                    percentualOcupacao: ((mesasReservadas / totalMesas) * 100).toFixed(1)
                },
                reservas: {
                    total: reservas.length,
                    receita_total: receitaTotal,
                    ultimos_7_dias: reservasPorDia
                }
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar estatísticas'
        });
    }
});

// ========== ROTAS ADMINISTRATIVAS ==========

// Criar nova mesa (admin)
app.post('/api/admin/mesas', async (req, res) => {
    try {
        const { numero, lugares, preco, status = 'disponivel' } = req.body;
        
        if (!numero || !lugares || !preco) {
            return res.status(400).json({
                success: false,
                error: 'Campos obrigatórios: numero, lugares, preco'
            });
        }
        
        const mesaData = { numero, lugares, preco, status };
        
        const response = await axios.post(
            `${BACK4APP_CONFIG.baseUrl}/classes/Mesas`,
            mesaData,
            { headers: getHeaders(true) } // Usar Master Key para admin
        );
        
        res.json({
            success: true,
            message: 'Mesa criada com sucesso',
            data: response.data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao criar mesa'
        });
    }
});

// Atualizar mesa (admin)
app.put('/api/admin/mesas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const response = await axios.put(
            `${BACK4APP_CONFIG.baseUrl}/classes/Mesas/${id}`,
            updateData,
            { headers: getHeaders(true) }
        );
        
        res.json({
            success: true,
            message: 'Mesa atualizada com sucesso',
            data: response.data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar mesa'
        });
    }
});

// Deletar mesa (admin)
app.delete('/api/admin/mesas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await axios.delete(
            `${BACK4APP_CONFIG.baseUrl}/classes/Mesas/${id}`,
            { headers: getHeaders(true) }
        );
        
        res.json({
            success: true,
            message: 'Mesa removida com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao remover mesa'
        });
    }
});

// ========== ROTA PARA POPULAR DADOS INICIAIS ==========

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
            await axios.post(
                `${BACK4APP_CONFIG.baseUrl}/classes/Mesas`,
                mesa,
                { headers: getHeaders(true) }
            );
            criadas++;
            await delay(100); // Pequeno delay para não sobrecarregar
        }
        
        res.json({
            success: true,
            message: `${criadas} mesas criadas com sucesso!`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao popular dados'
        });
    }
});

// ============================================
// MIDDLEWARE DE ERROS
// ============================================

app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📋 API disponível em http://localhost:${PORT}`);
    console.log(`
    ═══════════════════════════════════════════════════
    📌 ENDPOINTS DISPONÍVEIS:
    
    ✅ GET    /api/mesas                 - Listar todas mesas
    ✅ GET    /api/mesas/disponiveis     - Listar mesas disponíveis
    ✅ GET    /api/mesas/:id             - Buscar mesa por ID
    ✅ POST   /api/reservas              - Criar reserva
    ✅ GET    /api/reservas              - Listar reservas
    ✅ GET    /api/reservas/email/:email - Buscar reservas por email
    ✅ DELETE /api/reservas/:id          - Cancelar reserva
    ✅ GET    /api/estatisticas          - Estatísticas do sistema
    
    🔒 ADMIN (requer Master Key):
    ✅ POST   /api/admin/mesas           - Criar mesa
    ✅ PUT    /api/admin/mesas/:id       - Atualizar mesa
    ✅ DELETE /api/admin/mesas/:id       - Deletar mesa
    ✅ POST   /api/admin/seed            - Popular dados iniciais
    ═══════════════════════════════════════════════════
    `);
});

module.exports = app;