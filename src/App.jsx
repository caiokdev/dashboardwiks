import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { FunnelChart, Funnel, LabelList, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { parseISO, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
import './index.css';

// Credenciais do Supabase configuradas com a URL da API e a Chave Anon
const supabaseUrl = 'https://mcyuqwrbmvvmofbvhrph.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jeXVxd3JibXZ2bW9mYnZocnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDMwMjgsImV4cCI6MjA4ODgxOTAyOH0.jrSaQbZ1Lirj7QijMnaN-myEHoHt4j79uVPNrzXPgaE';
const supabase = createClient(supabaseUrl, supabaseKey);

// Nome da tabela atualizado para a nova estrutura de leads brutos
const NOME_DA_TABELA = 'leads_clientes';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip" style={{ backgroundColor: '#1e293b', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}>
        <p className="label" style={{ color: '#e2e8f0', fontWeight: 'bold' }}>{payload[0].payload.etapa}</p>
        <p className="value" style={{ color: '#38bdf8' }}>Valor: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function DashboardLeads() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(null); // null if not logged in
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Admin Management Modal State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('cliente');
  const [newIdCliente, setNewIdCliente] = useState('');
  
  // Database Client Renaming State
  const [dbClienteAntigo, setDbClienteAntigo] = useState('');
  const [dbClienteNovo, setDbClienteNovo] = useState('');
  
  const [dadosBrutos, setDadosBrutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [kpiData, setKpiData] = useState({ leads: 0, saudacoes: 0, conversas: 0, agendamentos: 0 });
  
  // Novos estados para filtro de data
  const [dateFilter, setDateFilter] = useState('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const [carregando, setCarregando] = useState(false); // Mudado para false por causa da tela de login

  // Hook que só carrega a dashboard se o userId estiver resolvido
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        carregarTodosUsuarios();
      }
      carregarDados();
    }
  }, [dateFilter, currentUser]);

  useEffect(() => {
    processarDadosDoCliente();
  }, [clienteSelecionado, dadosBrutos]);

  const carregarDados = async () => {
    // Se for personalizado e as datas estiverem vazias, não faz fetch pra não dar erro
    if (dateFilter === 'personalizado' && (!customStartDate || !customEndDate)) {
      return; 
    }

    setCarregando(true);
    
    let query = supabase.from(NOME_DA_TABELA).select('*');

    // Se o usuário não for admin, ele só vê os logs do id_cliente que pertence a ele
    if (currentUser && currentUser.role !== 'admin' && currentUser.id_cliente) {
       query = query.eq('id_cliente', currentUser.id_cliente);
    }

    // Lógica para determinar Inicio e Fim baseado no filtro selecionado
    const hoje = new Date();
    let dataInicioStr = null;
    let dataFimStr = null;

    if (dateFilter === '7d') {
      dataInicioStr = format(subDays(hoje, 7), 'yyyy-MM-dd');
    } else if (dateFilter === 'semana_atual') {
      dataInicioStr = format(startOfWeek(hoje, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    } else if (dateFilter === 'semana_passada') {
      const inicioSemanaAtual = startOfWeek(hoje, { weekStartsOn: 1 });
      dataInicioStr = format(subDays(inicioSemanaAtual, 7), 'yyyy-MM-dd');
      dataFimStr = format(subDays(inicioSemanaAtual, 1), 'yyyy-MM-dd');
    } else if (dateFilter === 'mes_atual') {
      dataInicioStr = format(startOfMonth(hoje), 'yyyy-MM-dd');
    } else if (dateFilter === 'mes_passado') {
      const primeiroDiaMesAtual = startOfMonth(hoje);
      const ultimoDiaMesPassado = subDays(primeiroDiaMesAtual, 1);
      dataInicioStr = format(startOfMonth(ultimoDiaMesPassado), 'yyyy-MM-dd');
      dataFimStr = format(endOfMonth(ultimoDiaMesPassado), 'yyyy-MM-dd');
    } else if (dateFilter === '30d') {
      dataInicioStr = format(subDays(hoje, 30), 'yyyy-MM-dd');
    } else if (dateFilter === 'personalizado') {
      dataInicioStr = customStartDate;
      dataFimStr = customEndDate;
    }

    // Aplica o filtro na querie (convertendo o dia local para UTC)
    if (dataInicioStr) {
      const startLocal = new Date(`${dataInicioStr}T00:00:00`);
      query = query.gte('data_entrada', startLocal.toISOString());
    }
    if (dataFimStr) {
      const endLocal = new Date(`${dataFimStr}T23:59:59.999`);
      query = query.lte('data_entrada', endLocal.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar dados:', error);
      setCarregando(false);
      return;
    }

    setDadosBrutos(data);

    // Extrai a lista de clientes únicos para o select e previne reset se já tem selecionado
    const clientesUnicos = [...new Set(data.map(item => item.id_cliente))];
    setClientes(clientesUnicos);

    if (clientesUnicos.length > 0 && !clientesUnicos.includes(clienteSelecionado)) {
      setClienteSelecionado(clientesUnicos[0]);
    } else if (!clienteSelecionado && clientesUnicos.length > 0) {
      setClienteSelecionado(clientesUnicos[0]);
    }
    
    setCarregando(false);
  };

  const processarDadosDoCliente = () => {
    if (!clienteSelecionado || dadosBrutos.length === 0) {
      setKpiData({ leads: 0, saudacoes: 0, conversas: 0, agendamentos: 0 });
      setDadosGrafico([]);
      return;
    }

    // Filtra as linhas do cliente escolhido
    const linhasDoCliente = dadosBrutos.filter(item => item.id_cliente === clienteSelecionado);

    // Na nova tabela cada linha é um lead e o 'status_funil' diz onde ele está.
    // O funil tem a lógica acumulativa: 
    // um agendamento TAMBÉM é uma conversa, que TAMBÉM é uma saudação.
    let countLead = 0;
    let countSaudacao = 0;
    let countConversa = 0;
    let countAgendamento = 0;

    linhasDoCliente.forEach(linha => {
      countLead++; // Todo lead na tabela constou na primeira etapa
      
      const status = linha.status_funil;
      if (status === 'Saudacao' || status === 'Conversa' || status === 'Agendamento') {
        countSaudacao++;
      }
      if (status === 'Conversa' || status === 'Agendamento') {
        countConversa++;
      }
      if (status === 'Agendamento') {
        countAgendamento++;
      }
    });

    setKpiData({ leads: countLead, saudacoes: countSaudacao, conversas: countConversa, agendamentos: countAgendamento });

    // Formata os dados para a biblioteca Recharts (Funil com Área)
    setDadosGrafico([
      { etapa: '1. Leads', valor: countLead },
      { etapa: '2. Saudações', valor: countSaudacao },
      { etapa: '3. Conversas', valor: countConversa },
      { etapa: '4. Agendamentos', valor: countAgendamento },
    ]);
  };

  // Funções Utilitárias para as Novas Taxas
  const calcularTaxa = (parte, todo) => {
    if (todo === 0) return '0.0%';
    return ((parte / todo) * 100).toFixed(1) + '%';
  };

  const taxaResposta = calcularTaxa(kpiData.saudacoes, kpiData.leads);
  const taxaConversaoConversa = calcularTaxa(kpiData.conversas, kpiData.saudacoes);
  const taxaAgendamento = calcularTaxa(kpiData.agendamentos, kpiData.leads);

  // ---------------- AUTENTICAÇÃO E ADMIN ----------------
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setCarregando(true);
    
    // Busca usuário ignorando letras minúsculas/maiúsculas usando ilike, no mundo real é ideal eq
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', usernameInput)
      .limit(1);

    if (error || !data || data.length === 0) {
      setLoginError('Credenciais inválidas.');
      setCarregando(false);
      return;
    }

    const usuario = data[0];
    if (usuario.password !== passwordInput) {
      setLoginError('Credenciais inválidas.');
      setCarregando(false);
      return;
    }

    // Sucesso no login
    setCurrentUser(usuario);
    // Se não for admin, ele obrigatoriamente terá aquele select "travado" no nome do id_cliente dele.
    if (usuario.role !== 'admin') {
      setClienteSelecionado(usuario.id_cliente || '');
    }
    setCarregando(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUsernameInput('');
    setPasswordInput('');
    setDadosBrutos([]);
  };

  const carregarTodosUsuarios = async () => {
    if (currentUser?.role !== 'admin') return;
    const { data } = await supabase.from('usuarios').select('*');
    if (data) setAllUsers(data);
  };

  const handleAbrirAdmin = () => {
    setIsAdminModalOpen(true);
    carregarTodosUsuarios();
  };

  const criarOuAtualizarUsuario = async (e) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return alert("Preencha ao menos usuário e senha");
    
    // Verifica se usuário já existe para update
    const existente = allUsers.find(u => u.username === newUsername);

    if (existente) {
      const { error } = await supabase.from('usuarios').update({ password: newPassword, role: newRole, id_cliente: newIdCliente }).eq('id', existente.id);
      if (!error) {
        alert("Usuário atualizado com sucesso!");
        carregarTodosUsuarios();
      } else {
        alert("Erro ao atualizar: " + error.message);
      }
    } else {
      const { error } = await supabase.from('usuarios').insert([{ username: newUsername, password: newPassword, role: newRole, id_cliente: newIdCliente }]);
      if (!error) {
        alert("Usuário criado com sucesso!");
        setNewUsername('');
        setNewPassword('');
        setNewIdCliente('');
        carregarTodosUsuarios();
      } else {
        alert("Erro ao criar: " + error.message);
      }
    }
  };

  const deletarUsuario = async (id_usuario) => {
     if(window.confirm("Certeza que deseja deletar este usuário?")) {
        await supabase.from('usuarios').delete().eq('id', id_usuario);
        carregarTodosUsuarios();
     }
  };

  const renomearClienteNoDB = async (e) => {
    e.preventDefault();
    if (!dbClienteAntigo || !dbClienteNovo) return alert("Selecione o cliente antigo e digite o novo nome.");

    if(window.confirm(`Deseja renomear TODOS os leads de '${dbClienteAntigo}' para '${dbClienteNovo}' no banco de dados?`)) {
      setCarregando(true);
      const { error } = await supabase
        .from('leads_clientes')
        .update({ id_cliente: dbClienteNovo })
        .eq('id_cliente', dbClienteAntigo);

      if (!error) {
        alert("Cliente renomeado no banco de dados com sucesso!");
        setDbClienteAntigo('');
        setDbClienteNovo('');
        // Recarrega os dados pra refletir a alteração no dashboard e nos selects
        carregarDados(); 
      } else {
        alert("Erro ao renomear: " + error.message);
        setCarregando(false);
      }
    }
  };

  // ---------------- RENDERIZAÇÃO DA TELA DE LOGIN ----------------
  if (!currentUser) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '3rem', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)', width: '100%', maxWidth: '400px' }}>
          <h1 style={{ color: '#f8fafc', fontSize: '1.8rem', textAlign: 'center', marginBottom: '2rem' }}>Dashboard Login</h1>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Usuário</label>
              <input 
                type="text" 
                autoComplete="username"
                value={usernameInput} 
                onChange={(e) => setUsernameInput(e.target.value)} 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff' }} 
              />
            </div>
            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Senha</label>
              <input 
                type="password" 
                autoComplete="current-password"
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff' }} 
              />
            </div>
            {loginError && <div style={{ color: '#ef4444', fontSize: '0.9rem' }}>{loginError}</div>}
            <button type="submit" style={{ marginTop: '1rem', backgroundColor: '#3b82f6', color: '#fff', padding: '0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---------------- RENDERIZAÇÃO PRINCIPAL ----------------

  const coresFunil = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981'];

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header" style={{ flexWrap: 'wrap' }}>
        <h1 className="dashboard-title">Conversões & Leads</h1>
        <div className="filters-container" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Admin Tools */}
          {currentUser.role === 'admin' && (
            <button 
              onClick={handleAbrirAdmin}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              ⚙️ Gerenciar Usuários
            </button>
          )}

          {/* Date Filter */}
          <div className="filter-group">
            <label className="client-selector-label">Período:</label>
            <select
              className="client-select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="semana_atual">Semana Atual</option>
              <option value="semana_passada">Semana Passada</option>
              <option value="mes_atual">Mês Atual</option>
              <option value="mes_passado">Mês Passado</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="personalizado">Personalizado</option>
            </select>
            
            {dateFilter === 'personalizado' && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input 
                  type="date" 
                  className="client-select" 
                  style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)} 
                />
                <span style={{ color: '#fff', alignSelf: 'center' }}>até</span>
                <input 
                  type="date" 
                  className="client-select"
                  style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)} 
                />
                <button 
                  onClick={carregarDados}
                  style={{ padding: '0.4rem 0.8rem', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                >
                  Buscar
                </button>
              </div>
            )}
          </div>

          <div className="filter-group">
            <label className="client-selector-label">Cliente:</label>
            {currentUser.role === 'admin' ? (
              <select
                className="client-select"
                value={clienteSelecionado}
                onChange={(e) => setClienteSelecionado(e.target.value)}
              >
                {clientes.map(cliente => {
                  const usuarioVinculado = allUsers.find(u => u.id_cliente === cliente);
                  const nomeExibicao = usuarioVinculado ? usuarioVinculado.username : cliente;
                  return (
                    <option key={cliente} value={cliente}>{nomeExibicao}</option>
                  );
                })}
              </select>
            ) : (
                <div style={{ padding: '0.5rem', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.9rem' }}>
                  {currentUser.id_cliente || 'Nenhum'}
                </div>
            )}
          </div>

          <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', marginLeft: 'auto' }}>
            Sair
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flexGrow: 1, position: 'relative' }}>
        {carregando && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '12px' }}>
             <div className="spinner"></div>
          </div>
        )}
        {/* KPI Cards Grid (Métricas Base) */}
        <section className="kpi-grid">
          <div className="kpi-card" style={{ '--accent-gradient': 'linear-gradient(135deg, #3b82f6, #60a5fa)' }}>
            <div className="kpi-label">Total de Leads</div>
            <div className="kpi-value">{kpiData.leads}</div>
            <svg className="kpi-icon-wrapper" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>

          <div className="kpi-card" style={{ '--accent-gradient': 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
            <div className="kpi-label">Saudações Respondidas</div>
            <div className="kpi-value">{kpiData.saudacoes}</div>
            <svg className="kpi-icon-wrapper" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>

          <div className="kpi-card" style={{ '--accent-gradient': 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
            <div className="kpi-label">Conversas Continuadas</div>
            <div className="kpi-value">{kpiData.conversas}</div>
            <svg className="kpi-icon-wrapper" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12c0 2.457.886 4.706 2.35 6.444.605.717.842 1.649.658 2.571l-.164.82a1.002 1.002 0 0 0 1.295 1.139l.995-.331a3 3 0 0 1 2.428.146A9.957 9.957 0 0 0 12 22Z"></path><path d="m9 12 2 2 4-4"></path></svg>
          </div>

          <div className="kpi-card" style={{ '--accent-gradient': 'linear-gradient(135deg, #10b981, #34d399)' }}>
            <div className="kpi-label">Agendamentos</div>
            <div className="kpi-value">{kpiData.agendamentos}</div>
            <svg className="kpi-icon-wrapper" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
        </section>

        {/* Conversion Rate Cards */}
        <section className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          <div className="kpi-card" style={{ '--accent-gradient': 'linear-gradient(135deg, #ec4899, #f472b6)', borderTop: '2px solid #ec4899' }}>
            <div className="kpi-label">Taxa de Resposta</div>
            <div className="kpi-value">{taxaResposta}</div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>Saudações Respondidas / Leads</p>
          </div>
          
          <div className="kpi-card" style={{ '--accent-gradient': 'linear-gradient(135deg, #0ea5e9, #38bdf8)', borderTop: '2px solid #0ea5e9' }}>
            <div className="kpi-label">Taxa de Retenção</div>
            <div className="kpi-value">{taxaConversaoConversa}</div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>Conversas / Saudações</p>
          </div>

          <div className="kpi-card" style={{ '--accent-gradient': 'linear-gradient(135deg, #ef4444, #f87171)', borderTop: '2px solid #ef4444' }}>
            <div className="kpi-label">Taxa de Agendamento</div>
            <div className="kpi-value">{taxaAgendamento}</div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>Agendamentos / Leads</p>
          </div>
        </section>

        {/* Big Chart Area */}
        <section className="chart-container-wrapper" style={{ minHeight: '450px' }}>
          <div className="chart-header">
            <h2 className="chart-title">Análise do Funil (Mapeamento Linear)</h2>
            <p className="chart-subtitle">Retenção de usuários por etapa (Topo &gt; Fundo)</p>
          </div>
          <div style={{ width: '100%', height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <defs>
                  {/* Gradients for Sophisticated Look */}
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#1e40af" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="colorSaudacoes" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#5b21b6" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="colorConversas" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#b45309" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="colorAgendamentos" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#047857" stopOpacity={1} />
                  </linearGradient>
                  {/* Drop Shadow Filter */}
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.4"/>
                  </filter>
                </defs>
                <Tooltip content={<CustomTooltip />} />
                <Funnel
                  dataKey="valor"
                  data={dadosGrafico}
                  isAnimationActive
                  labelLine={false}
                  filter="url(#shadow)"
                >
                  <LabelList position="right" fill="#e2e8f0" stroke="none" dataKey="etapa" style={{ fontSize: '15px', fontWeight: 'bold'}} />
                  <LabelList position="center" fill="#ffffff" stroke="none" dataKey="valor" style={{ fontSize: '20px', fontWeight: '800', textShadow: '0px 2px 4px rgba(0,0,0,0.5)' }} />
                  {
                    dadosGrafico.map((entry, index) => {
                      const gradIds = ['url(#colorLeads)', 'url(#colorSaudacoes)', 'url(#colorConversas)', 'url(#colorAgendamentos)'];
                      return <Cell key={`cell-${index}`} fill={gradIds[index % gradIds.length]} stroke="#1e293b" strokeWidth={2} />;
                    })
                  }
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </section>
      </main>

      {/* Admin Modal */}
      {isAdminModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#f8fafc', margin: 0 }}>Gerenciar Usuários</h2>
              <button onClick={() => setIsAdminModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            
            <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#0f172a', borderRadius: '8px' }}>
              <h3 style={{ color: '#f8fafc', marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Renomear Cliente no Banco de Dados</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>Isso altera o ID do cliente em todas as linhas da tabela leads_clientes.</p>
              <form onSubmit={renomearClienteNoDB} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select value={dbClienteAntigo} onChange={(e) => setDbClienteAntigo(e.target.value)} style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff' }}>
                  <option value="">Selecione o Cliente Antigo...</option>
                  {clientes.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input 
                  type="text" 
                  placeholder="Novo ID/Nome desejado" 
                  value={dbClienteNovo} 
                  onChange={(e) => setDbClienteNovo(e.target.value)} 
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff' }} 
                />
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Renomear no DB
                </button>
              </form>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ color: '#f8fafc', marginTop: 0, fontSize: '1.1rem' }}>Vincular Usuários (Acesso)</h3>
            </div>
            <form onSubmit={criarOuAtualizarUsuario} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem', padding: '1rem', backgroundColor: '#0f172a', borderRadius: '8px' }}>
              <input type="text" placeholder="Usuário" value={newUsername} onChange={(e)=>setNewUsername(e.target.value)} style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff' }} />
              <input type="text" placeholder="Senha Nova" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff' }} />
              <select value={newRole} onChange={(e)=>setNewRole(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff' }}>
                <option value="cliente">Cliente</option>
                <option value="admin">Admin</option>
              </select>
              {newRole === 'cliente' && (
                <input 
                  type="text" 
                  placeholder="ID do Cliente na Tabela (Ex: email@syntax.com)" 
                  value={newIdCliente} 
                  onChange={(e)=>setNewIdCliente(e.target.value)} 
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff' }} 
                />
              )}
              <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Salvar</button>
            </form>

            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#f8fafc' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Usuário / Empresa</th>
                  <th style={{ padding: '0.5rem' }}>Senha</th>
                  <th style={{ padding: '0.5rem' }}>Tipo</th>
                  <th style={{ padding: '0.5rem' }}>ID Cliente (Filtro DB)</th>
                  <th style={{ padding: '0.5rem' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '0.5rem' }}>{u.username}</td>
                    <td style={{ padding: '0.5rem', color: '#94a3b8' }}>{u.password}</td>
                    <td style={{ padding: '0.5rem' }}>{u.role === 'admin' ? 'Administrador' : 'Cliente'}</td>
                    <td style={{ padding: '0.5rem' }}>{u.id_cliente || '-'}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <button onClick={() => { setNewUsername(u.username); setNewRole(u.role); setNewIdCliente(u.id_cliente || ''); }} style={{ marginRight: '0.5rem', padding: '0.2rem 0.5rem', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Editar</button>
                      <button onClick={() => deletarUsuario(u.id)} style={{ padding: '0.2rem 0.5rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
