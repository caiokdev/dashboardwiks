import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { parseISO, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
import './index.css';
import TodosOsLeads from './TodosOsLeads';

const supabaseUrl = 'https://mcyuqwrbmvvmofbvhrph.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jeXVxd3JibXZ2bW9mYnZocnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDMwMjgsImV4cCI6MjA4ODgxOTAyOH0.jrSaQbZ1Lirj7QijMnaN-myEHoHt4j79uVPNrzXPgaE';
const supabase = createClient(supabaseUrl, supabaseKey);

const NOME_DA_TABELA = 'leads_clientes';

export default function DashboardLeads() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
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

  // Novo Lead Modal State
  const [isNovoLeadModalOpen, setIsNovoLeadModalOpen] = useState(false);
  const [nlDataEntrada, setNlDataEntrada] = useState('');
  const [nlNome, setNlNome] = useState('');
  const [nlContato, setNlContato] = useState('');
  const [nlRespondeu, setNlRespondeu] = useState('Nao');
  const [nlContinuou, setNlContinuou] = useState('Nao');
  const [nlAgendou, setNlAgendou] = useState('Nao');
  const [nlObservacoes, setNlObservacoes] = useState('');
  const [nlIdCliente, setNlIdCliente] = useState('');

  const [dadosBrutos, setDadosBrutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [kpiData, setKpiData] = useState({ leads: 0, saudacoes: 0, conversas: 0, agendamentos: 0 });

  const [dateFilter, setDateFilter] = useState('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [hoveredPieSlice, setHoveredPieSlice] = useState(null); // { label, valor, color, pct, x, y }
  const [selectedLead, setSelectedLead] = useState(null); // Lead clicked for detail modal
  const [isEditingLead, setIsEditingLead] = useState(false); // Edit mode for selected lead
  const [editLeadData, setEditLeadData] = useState({}); // Form data for editing lead

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin') carregarTodosUsuarios();
      carregarDados();
    }
    setNlDataEntrada(new Date().toISOString().split('T')[0]);
  }, [dateFilter, currentUser]);

  useEffect(() => {
    processarDadosDoCliente();
  }, [clienteSelecionado, dadosBrutos]);

  const carregarDados = async () => {
    if (dateFilter === 'personalizado' && (!customStartDate || !customEndDate)) return;
    setCarregando(true);
    let query = supabase.from(NOME_DA_TABELA).select('*');
    if (currentUser && currentUser.role !== 'admin' && currentUser.id_cliente) {
      query = query.eq('id_cliente', currentUser.id_cliente);
    }
    const hoje = new Date();
    let dataInicioStr = null, dataFimStr = null;
    if (dateFilter === '7d') { dataInicioStr = format(subDays(hoje, 7), 'yyyy-MM-dd'); }
    else if (dateFilter === 'semana_atual') { dataInicioStr = format(startOfWeek(hoje, { weekStartsOn: 1 }), 'yyyy-MM-dd'); }
    else if (dateFilter === 'semana_passada') {
      const ini = startOfWeek(hoje, { weekStartsOn: 1 });
      dataInicioStr = format(subDays(ini, 7), 'yyyy-MM-dd');
      dataFimStr = format(subDays(ini, 1), 'yyyy-MM-dd');
    } else if (dateFilter === 'mes_atual') { dataInicioStr = format(startOfMonth(hoje), 'yyyy-MM-dd'); }
    else if (dateFilter === 'mes_passado') {
      const p = startOfMonth(hoje); const u = subDays(p, 1);
      dataInicioStr = format(startOfMonth(u), 'yyyy-MM-dd');
      dataFimStr = format(endOfMonth(u), 'yyyy-MM-dd');
    } else if (dateFilter === '30d') { dataInicioStr = format(subDays(hoje, 30), 'yyyy-MM-dd'); }
    else if (dateFilter === 'personalizado') { dataInicioStr = customStartDate; dataFimStr = customEndDate; }
    else if (dateFilter === 'todos') { dataInicioStr = null; dataFimStr = null; }

    if (dataInicioStr) query = query.gte('data_entrada', new Date(`${dataInicioStr}T00:00:00`).toISOString());
    if (dataFimStr) query = query.lte('data_entrada', new Date(`${dataFimStr}T23:59:59.999`).toISOString());

    const { data, error } = await query;
    if (error) { console.error('Erro ao buscar dados:', error); setCarregando(false); return; }
    setDadosBrutos(data);
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
    const linhas = dadosBrutos.filter(item => item.id_cliente === clienteSelecionado);
    let countLead = 0, countSaudacao = 0, countConversa = 0, countAgendamento = 0;
    linhas.forEach(linha => {
      const s = linha.status_funil;
      if (s === 'Lead' || !s) countLead++;
      else if (s === 'Saudacao') countSaudacao++;
      else if (s === 'Conversa') countConversa++;
      else if (s === 'Agendamento') countAgendamento++;
    });
    setKpiData({ leads: countLead, saudacoes: countSaudacao, conversas: countConversa, agendamentos: countAgendamento });
    setDadosGrafico([
      { etapa: '1. Apenas Leads', valor: countLead },
      { etapa: '2. Saudacoes', valor: countSaudacao },
      { etapa: '3. Conversas', valor: countConversa },
      { etapa: '4. Agendamentos', valor: countAgendamento },
    ]);
  };

  const calcularTaxa = (parte, todo) => todo === 0 ? '0.0%' : ((parte / todo) * 100).toFixed(1) + '%';
  const totalLeads = kpiData.leads + kpiData.saudacoes + kpiData.conversas + kpiData.agendamentos;
  const taxaResposta = calcularTaxa(kpiData.saudacoes + kpiData.conversas + kpiData.agendamentos, totalLeads);
  const taxaConversaoConversa = calcularTaxa(kpiData.conversas + kpiData.agendamentos, kpiData.saudacoes + kpiData.conversas + kpiData.agendamentos);
  const taxaAgendamento = calcularTaxa(kpiData.agendamentos, totalLeads);

  // AUTH
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setCarregando(true);
    const { data, error } = await supabase.from('usuarios').select('*').eq('username', usernameInput).limit(1);
    if (error || !data || data.length === 0) { setLoginError('Credenciais invalidas.'); setCarregando(false); return; }
    const usuario = data[0];
    if (usuario.password !== passwordInput) { setLoginError('Credenciais invalidas.'); setCarregando(false); return; }
    setCurrentUser(usuario);
    if (usuario.role !== 'admin') setClienteSelecionado(usuario.id_cliente || '');
    setCarregando(false);
  };

  const handleLogout = () => {
    setCurrentUser(null); setUsernameInput(''); setPasswordInput(''); setDadosBrutos([]);
  };

  const carregarTodosUsuarios = async () => {
    if (currentUser?.role !== 'admin') return;
    const { data } = await supabase.from('usuarios').select('*');
    if (data) setAllUsers(data);
  };

  const handleAbrirAdmin = () => { setIsAdminModalOpen(true); carregarTodosUsuarios(); };

  const [editingUserId, setEditingUserId] = useState(null);

  const criarOuAtualizarUsuario = async (e) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return alert('Preencha ao menos usuario e senha');
    
    if (editingUserId) {
      const { error } = await supabase.from('usuarios').update({ username: newUsername, password: newPassword, role: newRole, id_cliente: newIdCliente }).eq('id', editingUserId);
      if (!error) { alert('Usuario atualizado!'); setEditingUserId(null); setNewUsername(''); setNewPassword(''); setNewIdCliente(''); carregarTodosUsuarios(); } else alert('Erro: ' + error.message);
    } else {
      const { error } = await supabase.from('usuarios').insert([{ username: newUsername, password: newPassword, role: newRole, id_cliente: newIdCliente }]);
      if (!error) { alert('Usuario criado!'); setNewUsername(''); setNewPassword(''); setNewIdCliente(''); carregarTodosUsuarios(); } else alert('Erro: ' + error.message);
    }
  };

  const deletarUsuario = async (id_usuario) => {
    if (window.confirm('Certeza?')) { await supabase.from('usuarios').delete().eq('id', id_usuario); carregarTodosUsuarios(); }
  };

  const renomearClienteNoDB = async (e) => {
    e.preventDefault();
    if (!dbClienteAntigo || !dbClienteNovo) return alert('Selecione o cliente antigo e digite o novo nome.');
    if (window.confirm(`Renomear '${dbClienteAntigo}' para '${dbClienteNovo}'?`)) {
      setCarregando(true);
      const { error } = await supabase.from('leads_clientes').update({ id_cliente: dbClienteNovo }).eq('id_cliente', dbClienteAntigo);
      if (!error) { alert('Renomeado!'); setDbClienteAntigo(''); setDbClienteNovo(''); carregarDados(); } else { alert('Erro: ' + error.message); setCarregando(false); }
    }
  };

  const handleSalvarNovoLead = async (e) => {
    e.preventDefault();
    // Validate phone
    const digits = nlContato.replace(/\D/g, '');
    if (digits.length !== 11) { alert('O WhatsApp deve ter exatamente 11 digitos (DDD + 9 numeros).'); return; }
    setCarregando(true);
    let statusFunil = 'Lead';
    if (nlRespondeu === 'Sim') statusFunil = 'Saudacao';
    if (nlContinuou === 'Sim') statusFunil = 'Conversa';
    if (nlAgendou === 'Sim') statusFunil = 'Agendamento';
    let clienteDestino = '';
    if (currentUser.role === 'admin') {
      if (!nlIdCliente) { alert('Selecione um cliente para vincular esse lead.'); setCarregando(false); return; }
      clienteDestino = nlIdCliente;
    } else {
      clienteDestino = currentUser.id_cliente;
    }
    const leadData = {
      id_cliente: clienteDestino,
      id_lead_planilha: 'manual_' + Date.now().toString(),
      data_entrada: new Date(nlDataEntrada + 'T12:00:00Z').toISOString(),
      status_funil: statusFunil,
      nome: nlNome,
      contato: nlContato,
      observacoes: nlObservacoes,
    };
    const { error } = await supabase.from('leads_clientes').insert([leadData]);
    if (!error) {
      alert('Lead cadastrado com sucesso!');
      setIsNovoLeadModalOpen(false);
      setNlNome(''); setNlContato(''); setNlObservacoes('');
      setNlRespondeu('Nao'); setNlContinuou('Nao'); setNlAgendou('Nao');
      carregarDados();
    } else {
      alert('Erro ao salvar lead: ' + error.message);
    }
    setCarregando(false);
  };

  const handleSalvarEdicaoLead = async (e) => {
    e.preventDefault();
    if (!selectedLead) return;
    
    // Validate phone only if it is provided and not empty
    if (editLeadData.contato) {
      const digits = editLeadData.contato.replace(/\D/g, '');
      if (digits.length !== 11) { alert('O WhatsApp deve ter exatamente 11 digitos (DDD + 9 numeros).'); return; }
    }

    setCarregando(true);
    const { error } = await supabase.from('leads_clientes').update({
      nome: editLeadData.nome,
      contato: editLeadData.contato,
      status_funil: editLeadData.status_funil,
      observacoes: editLeadData.observacoes,
    }).eq('id', selectedLead.id);

    if (!error) {
      alert('Lead atualizado com sucesso!');
      setIsEditingLead(false);
      setSelectedLead({ ...selectedLead, ...editLeadData });
      carregarDados();
    } else {
      alert('Erro ao atualizar lead: ' + error.message);
    }
    setCarregando(false);
  };

  // ---- TELA DE LOGIN ----
  if (!currentUser) {
    return (
      <div style={{
        display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at 30% 40%, rgba(0,176,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at 75% 70%, rgba(0,230,118,0.1) 0%, transparent 50%), #130922',
      }}>
        <div style={{
          background: 'rgba(43,26,74,0.75)', backdropFilter: 'blur(24px)',
          padding: '2.5rem', borderRadius: '18px',
          boxShadow: '0 30px 70px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)',
          width: '100%', maxWidth: '380px', border: '1px solid rgba(255,255,255,0.09)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '58px', height: '58px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #00b0ff, #00e676)',
              marginBottom: '1rem', fontWeight: 900, color: '#08071a', fontSize: '1.6rem',
            }}>W</div>
            <h1 style={{
              margin: 0, fontSize: '1.5rem', fontWeight: 700,
              background: 'linear-gradient(135deg, #00b0ff, #00e676)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Wiks Dashboard</h1>
            <p style={{ color: '#64748b', fontSize: '0.84rem', marginTop: '0.3rem' }}>Faca login para continuar</p>
          </div>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block', fontWeight: 500 }}>Usuario</label>
              <input type="text" autoComplete="username" value={usernameInput} onChange={e => setUsernameInput(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
            </div>
            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block', fontWeight: 500 }}>Senha</label>
              <input type="password" autoComplete="current-password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
            </div>
            {loginError && (
              <div style={{ color: '#f87171', fontSize: '0.85rem', padding: '0.6rem 0.8rem', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)' }}>
                {loginError}
              </div>
            )}
            <button type="submit" style={{
              marginTop: '0.5rem', background: 'linear-gradient(135deg, #00b0ff, #00e676)',
              color: '#08071a', padding: '0.85rem', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.02em',
            }}>
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---- TELA PRINCIPAL ----
  if (currentUser && currentView === 'todos_leads') {
    return (
      <div className="dashboard-container">
        <TodosOsLeads
          currentUser={currentUser}
          clienteSelecionado={clienteSelecionado}
          supabase={supabase}
          onBack={() => setCurrentView('dashboard')}
        />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header" style={{ flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #00b0ff, #00e676)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, color: '#08071a', fontSize: '1.1rem', flexShrink: 0,
          }}>W</div>
          <h1 className="dashboard-title">Wiks Dashboard</h1>
        </div>
        <div className="filters-container" style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>

          {/* Admin Button */}
          {currentUser.role === 'admin' && (
            <button onClick={handleAbrirAdmin} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', background: 'rgba(139,92,246,0.12)',
              color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: '100px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
              transition: 'all 0.2s', backdropFilter: 'blur(8px)',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.25)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.12)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Usuarios
            </button>
          )}

          {/* Novo Lead Button - gradient accent */}
          <button onClick={() => setIsNovoLeadModalOpen(true)} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1.1rem',
            background: 'linear-gradient(135deg, #00b0ff 0%, #00e676 100%)',
            color: '#07040f', border: 'none', borderRadius: '100px',
            cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
            transition: 'all 0.2s', boxShadow: '0 0 18px rgba(0,176,255,0.25)',
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 28px rgba(0,176,255,0.45)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 18px rgba(0,176,255,0.25)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo Lead
          </button>

          {/* Divider */}
          <div style={{ width: '1px', height: '22px', background: 'rgba(255,255,255,0.1)', margin: '0 0.2rem' }} />

          {/* Period selector pill */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{
              position: 'absolute', left: '12px', display: 'flex', alignItems: 'center',
              pointerEvents: 'none', zIndex: 2, color: '#64748b',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{
              appearance: 'none', WebkitAppearance: 'none',
              paddingLeft: '32px', paddingRight: '28px', paddingTop: '0.48rem', paddingBottom: '0.48rem',
              background: 'rgba(255,255,255,0.05)', color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px',
              cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500,
              backdropFilter: 'blur(8px)', outline: 'none', transition: 'all 0.2s',
            }}>
              <option value="todos" style={{ background: '#1e1035', color: '#fff' }}>Todo o Periodo</option>
              <option value="7d" style={{ background: '#1e1035', color: '#fff' }}>Ultimos 7 dias</option>
              <option value="semana_atual" style={{ background: '#1e1035', color: '#fff' }}>Semana Atual</option>
              <option value="semana_passada" style={{ background: '#1e1035', color: '#fff' }}>Semana Passada</option>
              <option value="mes_atual" style={{ background: '#1e1035', color: '#fff' }}>Mes Atual</option>
              <option value="mes_passado" style={{ background: '#1e1035', color: '#fff' }}>Mes Passado</option>
              <option value="30d" style={{ background: '#1e1035', color: '#fff' }}>Ultimos 30 dias</option>
              <option value="personalizado" style={{ background: '#1e1035', color: '#fff' }}>Personalizado</option>
            </select>
            <div style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: '#64748b' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>

          {/* Custom dates */}
          {dateFilter === 'personalizado' && (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)}
                style={{ padding: '0.45rem 0.7rem', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', fontSize: '0.78rem', outline: 'none' }} />
              <span style={{ color: '#475569', fontSize: '0.78rem' }}>ate</span>
              <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)}
                style={{ padding: '0.45rem 0.7rem', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', fontSize: '0.78rem', outline: 'none' }} />
              <button onClick={carregarDados} style={{
                padding: '0.45rem 0.9rem', background: 'rgba(0,176,255,0.15)', color: '#00b0ff',
                border: '1px solid rgba(0,176,255,0.3)', borderRadius: '100px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
              }}>Buscar</button>
            </div>
          )}

          {/* Client selector pill */}
          {currentUser.role === 'admin' ? (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '12px', pointerEvents: 'none', color: '#64748b' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <select value={clienteSelecionado} onChange={e => setClienteSelecionado(e.target.value)} style={{
                appearance: 'none', WebkitAppearance: 'none',
                paddingLeft: '32px', paddingRight: '28px', paddingTop: '0.48rem', paddingBottom: '0.48rem',
                background: 'rgba(255,255,255,0.05)', color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px',
                cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500,
                backdropFilter: 'blur(8px)', outline: 'none',
              }}>
                {clientes.map(cliente => {
                  const u = allUsers.find(u => u.id_cliente === cliente);
                  return <option key={cliente} value={cliente} style={{ background: '#1e1035', color: '#fff' }}>{u ? u.username : cliente}</option>;
                })}
              </select>
              <div style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: '#64748b' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.45rem 1rem', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px',
              color: '#cbd5e1', fontSize: '0.82rem',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              {currentUser.id_cliente || 'Nenhum'}
            </div>
          )}

          {/* Divider */}
          <div style={{ width: '1px', height: '22px', background: 'rgba(255,255,255,0.1)', margin: '0 0.2rem' }} />

          {/* Logout button */}
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)',
            color: '#f87171', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '100px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.22)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sair
          </button>
        </div>
      </header>


      {/* Main Content */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flexGrow: 1, position: 'relative' }}>
        {carregando && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '12px' }}>
            <div className="spinner"></div>
          </div>
        )}

        {/* KPI Cards Row 1 */}
        <section className="kpi-grid">
          <div className="kpi-card" style={{ '--accent-gradient': 'linear-gradient(135deg, #00b0ff, #0077d6)' }}>
            <div className="kpi-label">Apenas Leads (Nao resp.)</div>
            <div className="kpi-value">{kpiData.leads}</div>
            <svg className="kpi-icon-wrapper" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <div className="kpi-card" style={{ '--accent-gradient': 'linear-gradient(135deg, #8b5cf6, #5b21b6)' }}>
            <div className="kpi-label">Pararam na Saudacao</div>
            <div className="kpi-value">{kpiData.saudacoes}</div>
            <svg className="kpi-icon-wrapper" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <div className="kpi-card" style={{ '--accent-gradient': 'linear-gradient(135deg, #f59e0b, #b45309)' }}>
            <div className="kpi-label">Em Conversacao (Ainda nao agendou)</div>
            <div className="kpi-value">{kpiData.conversas}</div>
            <svg className="kpi-icon-wrapper" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12c0 2.457.886 4.706 2.35 6.444.605.717.842 1.649.658 2.571l-.164.82a1.002 1.002 0 0 0 1.295 1.139l.995-.331a3 3 0 0 1 2.428.146A9.957 9.957 0 0 0 12 22Z"></path><path d="m9 12 2 2 4-4"></path></svg>
          </div>
          <div className="kpi-card" style={{ '--accent-gradient': 'linear-gradient(135deg, #00e676, #00994d)' }}>
            <div className="kpi-label">Agendamentos</div>
            <div className="kpi-value">{kpiData.agendamentos}</div>
            <svg className="kpi-icon-wrapper" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
        </section>

        {/* KPI Cards Row 2 - Rates */}
        <section className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          <div className="kpi-card" style={{ '--accent-gradient': 'linear-gradient(135deg, #ec4899, #f472b6)', borderTop: '2px solid #ec4899' }}>
            <div className="kpi-label">Taxa de Resposta</div>
            <div className="kpi-value">{taxaResposta}</div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>Saudacoes / Leads</p>
          </div>
          <div className="kpi-card" style={{ '--accent-gradient': 'linear-gradient(135deg, #0ea5e9, #38bdf8)', borderTop: '2px solid #0ea5e9' }}>
            <div className="kpi-label">Taxa de Retencao</div>
            <div className="kpi-value">{taxaConversaoConversa}</div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>Conversas / Saudacoes</p>
          </div>
          <div className="kpi-card" style={{ '--accent-gradient': 'linear-gradient(135deg, #ef4444, #f87171)', borderTop: '2px solid #ef4444' }}>
            <div className="kpi-label">Taxa de Agendamento</div>
            <div className="kpi-value">{taxaAgendamento}</div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>Agendamentos / Leads</p>
          </div>
        </section>

        {/* Charts Row: Funnel + Pie */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

          {/* LEFT: Custom SVG Funnel (smaller) */}
          <div className="chart-container-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-header">
              <h2 className="chart-title">Funil de Conversao</h2>
              <p className="chart-subtitle">Retencao por etapa (Topo ao Fundo)</p>
            </div>
            <div style={{ flexGrow: 1, display: 'flex', width: '100%', minHeight: '180px', padding: '0.4rem 0' }}>
              {(() => {
                const stages = [
                  { label: 'Leads',        valor: kpiData.leads,        fill: ['#00b0ff','#0077d6'] },
                  { label: 'Saudacoes',    valor: kpiData.saudacoes,    fill: ['#8b5cf6','#5b21b6'] },
                  { label: 'Conversas',    valor: kpiData.conversas,    fill: ['#f59e0b','#b45309'] },
                  { label: 'Agendamentos', valor: kpiData.agendamentos, fill: ['#00e676','#00994d'] },
                ];
                const VW = 380, VH = 330;
                const tipX = VW / 2, tipY = VH - 20;
                const topLX = 25, topRX = VW - 25, topY = 20;
                const bands = stages.length;
                const bandH = (tipY - topY) / bands;
                const getX = (y, side) => {
                  const t = (y - topY) / (tipY - topY);
                  return side === 'L' ? topLX + (tipX - topLX) * t : topRX + (tipX - topRX) * t;
                };
                return (
                  <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', height: '100%', maxHeight: '310px', display: 'block', margin: '0 auto', overflow: 'visible' }}>
                    <defs>
                      {stages.map((s, i) => (
                        <linearGradient key={i} id={`fg${i}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={s.fill[0]} />
                          <stop offset="100%" stopColor={s.fill[1]} />
                        </linearGradient>
                      ))}
                      <filter id="fShadow">
                        <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#000" floodOpacity="0.45" />
                      </filter>
                    </defs>
                    {stages.map((s, i) => {
                      const y0 = topY + i * bandH, y1 = topY + (i + 1) * bandH;
                      const xl0 = getX(y0, 'L'), xr0 = getX(y0, 'R');
                      const xl1 = getX(y1, 'L'), xr1 = getX(y1, 'R');
                      const isLast = i === bands - 1;
                      const pts = isLast
                        ? `${xl0},${y0} ${xr0},${y0} ${tipX},${tipY}`
                        : `${xl0},${y0} ${xr0},${y0} ${xr1},${y1} ${xl1},${y1}`;
                      const yc = isLast ? y0 + (tipY - y0) * 0.42 : (y0 + y1) / 2;
                      const bandW = xr0 - xl0;
                      return (
                        <g key={i}>
                          <polygon points={pts} fill={`url(#fg${i})`} filter="url(#fShadow)" />
                          {i > 0 && <line x1={xl0} y1={y0} x2={xr0} y2={y0} stroke="rgba(10,5,20,0.4)" strokeWidth="2" />}
                          <polygon
                            points={isLast
                              ? `${xl0+5},${y0+2} ${xr0-5},${y0+2} ${tipX},${tipY-(tipY-y0)*0.25}`
                              : `${xl0+5},${y0+3} ${xr0-5},${y0+3} ${xr0-5},${y0+8} ${xl0+5},${y0+8}`}
                            fill="rgba(255,255,255,0.1)" />
                          <text x={tipX} y={yc - 6} textAnchor="middle" dominantBaseline="middle"
                            fill="white" fontSize={bandW > 80 ? "18" : "13"} fontWeight="800"
                            style={{ fontFamily: 'Inter, sans-serif' }}>
                            {s.valor}
                          </text>
                          {bandW > 60 && (
                            <text x={tipX} y={yc + 10} textAnchor="middle" dominantBaseline="middle"
                              fill="rgba(255,255,255,0.8)" fontSize="10" fontWeight="600"
                              style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.04em' }}>
                              {s.label.toUpperCase()}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    <polygon points={`${topLX},${topY} ${topRX},${topY} ${tipX},${tipY}`}
                      fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                );
              })()}
            </div>
          </div>

          {/* RIGHT: SVG Donut Pie Chart */}
          <div className="chart-container-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-header">
              <h2 className="chart-title">Distribuicao de Leads</h2>
              <p className="chart-subtitle">Proporcao por etapa do funil</p>
            </div>
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '180px', position: 'relative' }}>
              {(() => {
                const pieItems = [
                  { label: 'Apenas Lead',   valor: kpiData.leads,         color: '#00b0ff' },
                  { label: 'Saudou',        valor: kpiData.saudacoes,     color: '#8b5cf6' },
                  { label: 'Conversou',     valor: kpiData.conversas,     color: '#f59e0b' },
                  { label: 'Agendou',       valor: kpiData.agendamentos,  color: '#00e676' },
                ];
                const total = pieItems.reduce((s, d) => s + d.valor, 0);
                const cx = 200, cy = 200, outerR = 170, innerR = 96;

                const polarToXY = (angle, r) => ({
                  x: cx + r * Math.cos((angle - 90) * Math.PI / 180),
                  y: cy + r * Math.sin((angle - 90) * Math.PI / 180),
                });
                const arcPath = (startA, endA) => {
                  const s1 = polarToXY(startA, outerR), e1 = polarToXY(endA, outerR);
                  const s2 = polarToXY(endA, innerR), e2 = polarToXY(startA, innerR);
                  const large = endA - startA > 180 ? 1 : 0;
                  return `M ${s1.x} ${s1.y} A ${outerR} ${outerR} 0 ${large} 1 ${e1.x} ${e1.y} L ${s2.x} ${s2.y} A ${innerR} ${innerR} 0 ${large} 0 ${e2.x} ${e2.y} Z`;
                };

                if (total === 0) {
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1, opacity: 0.5 }}>
                      <p style={{ color: '#94a3b8' }}>Sem dados no periodo</p>
                    </div>
                  );
                }

                let currentAngle = 0;
                const slices = pieItems.map((item) => {
                  const angle = (item.valor / total) * 360;
                  const midA = currentAngle + angle / 2;
                  const midX = polarToXY(midA, (outerR + innerR) / 2).x;
                  const midY = polarToXY(midA, (outerR + innerR) / 2).y;
                  const slice = { ...item, path: arcPath(currentAngle, currentAngle + angle), midX, midY, pct: ((item.valor / total) * 100).toFixed(0) + '%' };
                  currentAngle += angle;
                  return slice;
                }).filter(s => s.valor > 0);

                const pct = (v) => total > 0 ? ((v / total) * 100).toFixed(0) + '%' : '0%';

                return (
                  <>
                    {/* Hover tooltip */}
                    {hoveredPieSlice && (
                      <div style={{
                        position: 'absolute', top: hoveredPieSlice.y, left: hoveredPieSlice.x,
                        transform: 'translate(-50%, -110%)',
                        background: 'rgba(15,5,35,0.92)', backdropFilter: 'blur(10px)',
                        border: `1px solid ${hoveredPieSlice.color}55`,
                        borderRadius: '8px', padding: '0.45rem 0.8rem',
                        pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap',
                        boxShadow: `0 4px 20px rgba(0,0,0,0.5)`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: hoveredPieSlice.color }} />
                          <span style={{ color: '#f1f5f9', fontSize: '0.8rem', fontWeight: 600 }}>{hoveredPieSlice.label}</span>
                        </div>
                        <div style={{ color: hoveredPieSlice.color, fontSize: '1rem', fontWeight: 800, textAlign: 'center' }}>
                          {hoveredPieSlice.valor} <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 400 }}>({hoveredPieSlice.pct})</span>
                        </div>
                      </div>
                    )}
                    {/* Donut SVG */}
                    <svg viewBox="0 0 400 400" style={{ width: '100%', height: '100%', maxHeight: '310px', display: 'block', margin: '0 auto', cursor: 'pointer' }}
                      onMouseLeave={() => setHoveredPieSlice(null)}>
                      <defs>
                        <filter id="pShadow">
                          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.45" />
                        </filter>
                        <filter id="pHover">
                          <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="currentColor" floodOpacity="0.6" />
                        </filter>
                      </defs>
                      {slices.map((s, i) => (
                        <path key={i} d={s.path}
                          fill={s.color}
                          filter="url(#pShadow)"
                          stroke={hoveredPieSlice?.label === s.label ? 'rgba(255,255,255,0.4)' : 'rgba(10,3,26,0.6)'}
                          strokeWidth={hoveredPieSlice?.label === s.label ? '4' : '2'}
                          style={{ transition: 'stroke-width 0.15s, opacity 0.15s', opacity: hoveredPieSlice && hoveredPieSlice.label !== s.label ? 0.55 : 1 }}
                          onMouseMove={(e) => {
                            const rect = e.currentTarget.closest('svg').parentElement.getBoundingClientRect();
                            setHoveredPieSlice({ label: s.label, valor: s.valor, color: s.color, pct: s.pct, x: e.clientX - rect.left, y: e.clientY - rect.top });
                          }}
                        />
                      ))}
                      {/* Center: total leads */}
                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                        fill="white" fontSize="44" fontWeight="900"
                        style={{ fontFamily: 'Inter, sans-serif' }}>{total}</text>
                      <text x={cx} y={cy + 36} textAnchor="middle" dominantBaseline="central"
                        fill="#64748b" fontSize="14" fontWeight="500"
                        style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.12em' }}>LEADS</text>
                    </svg>
                    {/* Legend - horizontal row at bottom */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', justifyContent: 'center', padding: '0.6rem 0.5rem 0.2rem' }}>
                      {pieItems.filter(p => p.valor > 0).map((p, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ width: '9px', height: '9px', borderRadius: '2px', background: p.color }} />
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.label}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: p.color }}>{p.valor}</span>
                          <span style={{ fontSize: '0.7rem', color: '#475569' }}>({pct(p.valor)})</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </section>

        {/* Leads Recentes - Full Width */}
        <section className="chart-container-wrapper">
          <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 className="chart-title">Leads Recentes</h2>
              <p className="chart-subtitle">Entradas mais recentes do cliente selecionado</p>
            </div>
            <button
              onClick={() => setCurrentView('todos_leads')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 1.2rem',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '100px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Todos os Leads
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '0.6rem' }}>
            {(() => {
              const stageColors = {
                'Lead': { bg: 'rgba(100,116,139,0.2)', text: '#94a3b8', label: 'Lead' },
                'Saudacao': { bg: 'rgba(139,92,246,0.2)', text: '#a78bfa', label: 'Saudou' },
                'Conversa': { bg: 'rgba(245,158,11,0.2)', text: '#fbbf24', label: 'Conversou' },
                'Agendamento': { bg: 'rgba(0,230,118,0.15)', text: '#00e676', label: 'Agendou' },
              };
              const leadsRecentes = dadosBrutos
                .filter(item => item.id_cliente === clienteSelecionado)
                .sort((a, b) => new Date(b.data_entrada) - new Date(a.data_entrada))
                .slice(0, 12);
              if (leadsRecentes.length === 0) {
                return (
                  <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', opacity: 0.5, gap: '0.5rem' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhum lead no periodo</p>
                  </div>
                );
              }
              return leadsRecentes.map((lead, idx) => {
                const stage = stageColors[lead.status_funil] || stageColors['Lead'];
                const dataFormatada = lead.data_entrada
                  ? new Date(lead.data_entrada).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                  : '';
                return (
                  <div key={lead.id || idx}
                    onClick={() => {
                      setSelectedLead(lead);
                      setIsEditingLead(false);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.8rem',
                      padding: '0.7rem 0.9rem', borderRadius: '10px',
                      backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      transition: 'all 0.18s', cursor: 'pointer',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = `${stage.text}44`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #00b0ff, #00e676)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#0a0a14' }}>
                      {(lead.nome || lead.id_lead_planilha || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lead.nome || lead.id_lead_planilha || lead.contato || 'Lead sem nome'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                        {lead.nome && !/^\d+$/.test(lead.nome.replace(/\D/g, '')) ? (lead.contato || '') : ''}
                      </div>
                    </div>
                    <div style={{ padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: stage.bg, color: stage.text, whiteSpace: 'nowrap' }}>
                      {stage.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#475569', minWidth: '48px', textAlign: 'right' }}>
                      {dataFormatada}
                    </div>
                    {/* Click hint */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                );
              });
            })()}
          </div>
        </section>
      </main>

      {/* Lead Detail Modal */}
      {selectedLead && (() => {
        const stageColors = {
          'Lead': { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8', label: 'Apenas Lead', icon: '👤' },
          'Saudacao': { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa', label: 'Saudou', icon: '👋' },
          'Conversa': { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24', label: 'Conversou', icon: '💬' },
          'Agendamento': { bg: 'rgba(0,230,118,0.12)', text: '#00e676', label: 'Agendou', icon: '📅' },
        };
        const fStatus = selectedLead.status_funil || 'Lead';
        const stage = stageColors[fStatus] || stageColors['Lead'];
        const dataFormatada = selectedLead.data_entrada
          ? new Date(selectedLead.data_entrada).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
          : 'Nao informado';

        const hasRespondeu = ['Saudacao', 'Conversa', 'Agendamento'].includes(fStatus) ? 'Sim' : 'Nao';
        const hasContinuou = ['Conversa', 'Agendamento'].includes(fStatus) ? 'Sim' : 'Nao';
        const hasAgendou = ['Agendamento'].includes(fStatus) ? 'Sim' : 'Nao';

        const fields = [
          { label: 'Respondeu a saudacao?', value: hasRespondeu, icon: '👋' },
          { label: 'Deu continuidade?', value: hasContinuou, icon: '💬' },
          { label: 'Agendou?', value: hasAgendou, icon: '📅' },
        ];
        const isSim = v => (v || '').toLowerCase() === 'sim';
        return (
          <div onClick={() => setSelectedLead(null)} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9998,
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: 'linear-gradient(145deg, #12082a 0%, #1a0f3a 100%)',
              border: `1px solid ${stage.text}33`,
              borderRadius: '20px', width: '92%', maxWidth: '650px',
              boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 40px ${stage.text}18`,
              overflow: 'hidden',
            }}>
              {/* Header band */}
              <div style={{ padding: '1.5rem', background: stage.bg, borderBottom: `1px solid ${stage.text}22`, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #00b0ff, #00e676)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', fontWeight: 900, color: '#0a0a14',
                  boxShadow: '0 4px 16px rgba(0,176,255,0.3)',
                }}>
                  {(selectedLead.nome || selectedLead.id_lead_planilha || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isEditingLead ? "Editar Lead" : (selectedLead.nome || selectedLead.id_lead_planilha || 'Lead sem nome')}
                  </div>
                  {!isEditingLead && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      <span style={{ padding: '0.2rem 0.7rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, background: stage.bg, color: stage.text, border: `1px solid ${stage.text}44` }}>
                        {stage.icon} {stage.label}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', alignSelf: 'center' }}>{dataFormatada}</span>
                    </div>
                  )}
                </div>
                
                {!isEditingLead && (
                  <button onClick={(e) => {
                    e.stopPropagation();
                    
                    let parsedPhone = selectedLead.contato || '';
                    if (!parsedPhone && selectedLead.id_lead_planilha && /^\d+$/.test(selectedLead.id_lead_planilha.replace(/\D/g, ''))) {
                      parsedPhone = selectedLead.id_lead_planilha;
                    }
                    if (!parsedPhone && selectedLead.nome && /^\d+$/.test(selectedLead.nome.replace(/\D/g, ''))) {
                      parsedPhone = selectedLead.nome;
                    }

                    // Format phone for the input mask
                    const digits = parsedPhone.replace(/\D/g, '').slice(0, 11);
                    let masked = digits;
                    if (digits.length > 2) masked = `(${digits.slice(0,2)}) ${digits.slice(2)}`;
                    if (digits.length > 7) masked = `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;

                    setEditLeadData({
                      nome: (selectedLead.nome && !/^\d+$/.test(selectedLead.nome.replace(/\D/g, ''))) ? selectedLead.nome : '',
                      contato: masked,
                      status_funil: selectedLead.status_funil || 'Lead',
                      observacoes: selectedLead.observacoes || ''
                    });
                    setIsEditingLead(true);
                  }} style={{
                    background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px', padding: '0.4rem 0.8rem', color: '#3b82f6',
                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem',
                    transition: 'all 0.2s'
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Editar
                  </button>
                )}

                <button onClick={() => { setSelectedLead(null); setIsEditingLead(false); }} style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '50%', width: '32px', height: '32px', color: '#94a3b8',
                  cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>✕</button>
              </div>

              {/* Body */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {isEditingLead ? (
                  <form onSubmit={handleSalvarEdicaoLead} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ color: '#cbd5e1', fontSize: '0.85rem', mb: '0.3rem', display: 'block' }}>Nome do Lead</label>
                      <input type="text" value={editLeadData.nome} onChange={e => setEditLeadData({...editLeadData, nome: e.target.value})} 
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff' }} />
                    </div>
                    <div>
                      <label style={{ color: '#cbd5e1', fontSize: '0.85rem', mb: '0.3rem', display: 'block' }}>WhatsApp (DDD + 9 digitos)</label>
                      <input type="tel" value={editLeadData.contato} maxLength={15} 
                        onChange={e => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                          let masked = digits;
                          if (digits.length > 2) masked = `(${digits.slice(0,2)}) ${digits.slice(2)}`;
                          if (digits.length > 7) masked = `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
                          setEditLeadData({...editLeadData, contato: masked});
                        }} 
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff' }} />
                    </div>
                    <div>
                      <label style={{ color: '#cbd5e1', fontSize: '0.85rem', mb: '0.3rem', display: 'block' }}>Estágio no Funil</label>
                      <select value={editLeadData.status_funil} onChange={e => setEditLeadData({...editLeadData, status_funil: e.target.value})}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff' }}>
                        <option value="Lead" style={{backgroundColor: '#1a0f3a'}}>Lead (Não Respondeu)</option>
                        <option value="Saudacao" style={{backgroundColor: '#1a0f3a'}}>Saudação (Respondeu)</option>
                        <option value="Conversa" style={{backgroundColor: '#1a0f3a'}}>Conversa</option>
                        <option value="Agendamento" style={{backgroundColor: '#1a0f3a'}}>Agendamento</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ color: '#cbd5e1', fontSize: '0.85rem', mb: '0.3rem', display: 'block' }}>Observações</label>
                      <textarea rows="3" value={editLeadData.observacoes} onChange={e => setEditLeadData({...editLeadData, observacoes: e.target.value})}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff', resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setIsEditingLead(false)} style={{
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#cbd5e1',
                        padding: '0.7rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                      }}>Cancelar</button>
                      <button type="submit" disabled={carregando} style={{
                        background: 'linear-gradient(135deg, #00b0ff, #0077d6)', color: '#fff', border: 'none',
                        padding: '0.7rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700,
                        opacity: carregando ? 0.7 : 1
                      }}>{carregando ? 'Salvando...' : 'Salvar Alterações'}</button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* Contact */}
                    {selectedLead.contato && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem 1rem', background: 'rgba(0,176,255,0.07)', borderRadius: '10px', border: '1px solid rgba(0,176,255,0.15)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00b0ff" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.05 1h3a2 2 0 0 1 2 1.72c.13 1.02.37 2.03.71 3-.1.24-.6.78-1.17 1.08a16 16 0 0 0 6.29 6.29c.3-.57.84-1.07 1.08-1.17.97.34 1.98.58 3 .71A2 2 0 0 1 22 16.92z"/></svg>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.1rem' }}>WhatsApp</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0' }}>{selectedLead.contato}</div>
                        </div>
                      </div>
                    )}

                    {/* Interaction flags */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                      {fields.map(f => (
                        <div key={f.label} style={{
                          padding: '0.8rem', borderRadius: '10px', textAlign: 'center',
                          background: isSim(f.value) ? 'rgba(0,230,118,0.08)' : 'rgba(255,255,255,0.03)',
                          border: isSim(f.value) ? '1px solid rgba(0,230,118,0.25)' : '1px solid rgba(255,255,255,0.07)',
                        }}>
                          <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{f.icon}</div>
                          <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.3rem', lineHeight: 1.3 }}>{f.label}</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isSim(f.value) ? '#00e676' : '#f87171' }}>
                            {f.value || 'Nao'}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Observations */}
                    {selectedLead.observacoes && (
                      <div style={{ padding: '0.9rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Observacoes</div>
                        <div style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.6 }}>{selectedLead.observacoes}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Admin Modal */}


      {isAdminModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#1e1035', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#f8fafc', margin: 0 }}>Gerenciar Usuarios</h2>
              <button onClick={() => setIsAdminModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>x</button>
            </div>
            <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
              <h3 style={{ color: '#f8fafc', marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Renomear Cliente no Banco</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>Altera o ID do cliente em todas as linhas da tabela leads_clientes.</p>
              <form onSubmit={renomearClienteNoDB} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select value={dbClienteAntigo} onChange={e => setDbClienteAntigo(e.target.value)} style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#1e1035', color: '#fff' }}>
                  <option value="">Selecione o Cliente Antigo...</option>
                  {clientes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="text" placeholder="Novo ID/Nome" value={dbClienteNovo} onChange={e => setDbClienteNovo(e.target.value)}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#1e1035', color: '#fff' }} />
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Renomear no DB
                </button>
              </form>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ color: '#f8fafc', marginTop: 0, fontSize: '1.1rem' }}>Vincular Usuarios (Acesso)</h3>
            </div>
            <form onSubmit={criarOuAtualizarUsuario} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
              <input type="text" placeholder="Usuario" value={newUsername} onChange={e => setNewUsername(e.target.value)} style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#1e1035', color: '#fff' }} />
              <input type="text" placeholder="Senha Nova" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#1e1035', color: '#fff' }} />
              <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#1e1035', color: '#fff' }}>
                <option value="cliente">Cliente</option>
                <option value="admin">Admin</option>
              </select>
              {newRole === 'cliente' && (
                <input type="text" placeholder="ID do Cliente na Tabela" value={newIdCliente} onChange={e => setNewIdCliente(e.target.value)}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#1e1035', color: '#fff' }} />
              )}
              <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#00e676', color: '#0a0a14', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>Salvar</button>
            </form>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#f8fafc' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Usuario</th>
                  <th style={{ padding: '0.5rem' }}>Senha</th>
                  <th style={{ padding: '0.5rem' }}>Tipo</th>
                  <th style={{ padding: '0.5rem' }}>ID Cliente</th>
                  <th style={{ padding: '0.5rem' }}>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.5rem' }}>{u.username}</td>
                    <td style={{ padding: '0.5rem', color: '#94a3b8' }}>{u.password}</td>
                    <td style={{ padding: '0.5rem' }}>{u.role === 'admin' ? 'Admin' : 'Cliente'}</td>
                    <td style={{ padding: '0.5rem' }}>{u.id_cliente || '-'}</td>
                    <td style={{ padding: '0.5rem' }}>
                        <button onClick={() => { setEditingUserId(u.id); setNewUsername(u.username); setNewPassword(u.password); setNewRole(u.role); setNewIdCliente(u.id_cliente || ''); }} style={{ background: '#00b0ff', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem' }}>Editar</button>
                        <button onClick={() => deletarUsuario(u.id)} style={{ background: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem' }}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Novo Lead */}
      {isNovoLeadModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#170d2b', padding: '2rem', borderRadius: '14px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#f8fafc', margin: 0 }}>Cadastrar Novo Lead</h2>
              <button onClick={() => setIsNovoLeadModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>x</button>
            </div>
            <form onSubmit={handleSalvarNovoLead} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {currentUser.role === 'admin' && (
                <div>
                  <label style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '0.3rem', display: 'block' }}>Vincular ao Cliente*</label>
                  <select required value={nlIdCliente} onChange={e => setNlIdCliente(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#2b1a4a', color: '#fff' }}>
                    <option value="">Selecione o Cliente...</option>
                    {clientes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '0.3rem', display: 'block' }}>Data de Entrada*</label>
                <input required type="date" value={nlDataEntrada} onChange={e => setNlDataEntrada(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#2b1a4a', color: '#fff' }} />
              </div>
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '0.3rem', display: 'block' }}>Nome do Lead</label>
                <input type="text" placeholder="Nome completo ou apelido" value={nlNome} onChange={e => setNlNome(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#2b1a4a', color: '#fff' }} />
              </div>
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '0.3rem', display: 'block' }}>
                  WhatsApp* <span style={{ color: '#64748b', fontSize: '0.78rem' }}>(DDD + 9 digitos)</span>
                </label>
                <input
                  required
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={nlContato}
                  maxLength={15}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                    let masked = digits;
                    if (digits.length > 2) masked = `(${digits.slice(0,2)}) ${digits.slice(2)}`;
                    if (digits.length > 7) masked = `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
                    setNlContato(masked);
                  }}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#2b1a4a', color: '#fff' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                {[
                  ['Respondeu?', nlRespondeu, setNlRespondeu],
                  ['Continuou?', nlContinuou, setNlContinuou],
                  ['Agendou?', nlAgendou, setNlAgendou],
                ].map(([label, val, setter]) => (
                  <div key={label}>
                    <label style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.3rem', display: 'block' }}>{label}</label>
                    <select value={val} onChange={e => setter(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#2b1a4a', color: '#fff' }}>
                      <option value="Nao">Nao</option>
                      <option value="Sim">Sim</option>
                    </select>
                  </div>
                ))}
              </div>
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '0.3rem', display: 'block' }}>Observacoes</label>
                <textarea rows="3" placeholder="Informacoes extras..." value={nlObservacoes} onChange={e => setNlObservacoes(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#2b1a4a', color: '#fff', resize: 'vertical' }} />
              </div>
              <button type="submit" style={{ marginTop: '1rem', background: 'var(--accent-gradient)', color: '#fff', padding: '1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>
                {carregando ? 'Salvando...' : 'Cadastrar Lead'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
