import React, { useState, useEffect } from 'react';
import { subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

export default function TodosOsLeads({ currentUser, clienteSelecionado, supabase, onBack }) {
  const [dateFilter, setDateFilter] = useState('30d');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isEditingLead, setIsEditingLead] = useState(false); // Edit mode for selected lead
  const [editLeadData, setEditLeadData] = useState({}); // Form data for editing lead

  useEffect(() => {
    carregarLeads();
  }, [dateFilter, statusFilter, clienteSelecionado]);

  const carregarLeads = async () => {
    if (dateFilter === 'personalizado' && (!customStartDate || !customEndDate)) return;
    setCarregando(true);
    let query = supabase.from('leads_clientes').select('*');
    
    // Filter by client
    query = query.eq('id_cliente', clienteSelecionado);

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

    if (dataInicioStr) query = query.gte('data_entrada', new Date(`${dataInicioStr}T00:00:00`).toISOString());
    if (dataFimStr) query = query.lte('data_entrada', new Date(`${dataFimStr}T23:59:59.999`).toISOString());

    // Apply status filter based on what users consider "status_funil"
    if (statusFilter !== 'todos') {
      if (statusFilter === 'nao_respondeu') {
        query = query.eq('status_funil', 'Lead');
      } else if (statusFilter === 'respondeu') {
        query = query.eq('status_funil', 'Saudacao'); // Somente quem saudou
      } else if (statusFilter === 'continuou') {
        query = query.eq('status_funil', 'Conversa'); // Somente quem conversou
      } else if (statusFilter === 'agendou') {
        query = query.eq('status_funil', 'Agendamento');
      }
    }

    // Order by newest first
    query = query.order('data_entrada', { ascending: false });

    const { data, error } = await query;
    if (error) { 
        console.error('Erro ao buscar leads:', error); 
    } else {
        setLeads(data || []);
    }
    setCarregando(false);
  };

  const stageColors = {
    'Lead': { bg: 'rgba(100,116,139,0.2)', text: '#94a3b8', label: 'Apenas Lead', icon: '👤' },
    'Saudacao': { bg: 'rgba(139,92,246,0.2)', text: '#a78bfa', label: 'Saudou', icon: '👋' },
    'Conversa': { bg: 'rgba(245,158,11,0.2)', text: '#fbbf24', label: 'Conversou', icon: '💬' },
    'Agendamento': { bg: 'rgba(0,230,118,0.15)', text: '#00e676', label: 'Agendou', icon: '📅' },
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
      carregarLeads();
    } else {
      alert('Erro ao atualizar lead: ' + error.message);
    }
    setCarregando(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flexGrow: 1, position: 'relative' }}>
      
      {/* Header and Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onBack} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)',
            color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '100px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
            transition: 'all 0.2s', backdropFilter: 'blur(8px)',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Voltar
          </button>
          
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Todos os Leads
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.1rem 0 0 0' }}>
              Mostrando leads para {clienteSelecionado}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Status Filter */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: '12px', pointerEvents: 'none', color: '#64748b' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
              appearance: 'none', WebkitAppearance: 'none',
              paddingLeft: '32px', paddingRight: '28px', paddingTop: '0.55rem', paddingBottom: '0.55rem',
              background: 'rgba(30, 41, 59, 0.4)', color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
              cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
              backdropFilter: 'blur(8px)', outline: 'none', transition: 'all 0.2s',
            }}>
              <option value="todos" style={{ background: '#1e1035', color: '#fff' }}>Todos os Status</option>
              <option value="nao_respondeu" style={{ background: '#1e1035', color: '#fff' }}>Não Respondeu (Lead)</option>
              <option value="respondeu" style={{ background: '#1e1035', color: '#fff' }}>Respondeu à Saudação</option>
              <option value="continuou" style={{ background: '#1e1035', color: '#fff' }}>Continuou Conversa</option>
              <option value="agendou" style={{ background: '#1e1035', color: '#fff' }}>Agendou</option>
            </select>
            <div style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: '#64748b' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>

          {/* Date Filter */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: '12px', pointerEvents: 'none', color: '#64748b' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{
              appearance: 'none', WebkitAppearance: 'none',
              paddingLeft: '32px', paddingRight: '28px', paddingTop: '0.55rem', paddingBottom: '0.55rem',
              background: 'rgba(30, 41, 59, 0.4)', color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
              cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
              backdropFilter: 'blur(8px)', outline: 'none', transition: 'all 0.2s',
            }}>
              <option value="todos" style={{ background: '#1e1035', color: '#fff' }}>Todo o Periodo</option>
              <option value="7d" style={{ background: '#1e1035', color: '#fff' }}>Ultimos 7 dias</option>
              <option value="semana_atual" style={{ background: '#1e1035', color: '#fff' }}>Semana Atual</option>
              <option value="semana_passada" style={{ background: '#1e1035', color: '#fff' }}>Semana Passada</option>
              <option value="mes_atual" style={{ background: '#1e1035', color: '#fff' }}>Mes Atual</option>
              <option value="mes_passado" style={{ background: '#1e1035', color: '#fff' }}>Mes Passado</option>
              <option value="30d" style={{ background: '#1e1035', color: '#fff' }}>Ultimos 30 dias</option>
              <option value="personalizado" style={{ background: '#1e1035', color: '#fff' }}>Periodo Personalizado</option>
            </select>
            <div style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: '#64748b' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>

          {dateFilter === 'personalizado' && (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)}
                style={{ padding: '0.5rem 0.7rem', background: 'rgba(30, 41, 59, 0.4)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '0.8rem', outline: 'none' }} />
              <span style={{ color: '#475569', fontSize: '0.8rem' }}>ate</span>
              <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)}
                style={{ padding: '0.5rem 0.7rem', background: 'rgba(30, 41, 59, 0.4)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '0.8rem', outline: 'none' }} />
              <button onClick={carregarLeads} style={{
                padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #00b0ff, #0077d6)', color: '#fff',
                border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                boxShadow: '0 4px 12px rgba(0,176,255,0.3)', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,176,255,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,176,255,0.3)'; }}
              >
                Buscar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Leads List Wrapper */}
      <div className="chart-container-wrapper" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
          <div style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}>
            {carregando ? 'Buscando leads...' : `${leads.length} leads encontrados no periodo`}
          </div>
        </div>

        {carregando ? (
           <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
             <div className="spinner"></div>
           </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '0.8rem', alignContent: 'start', overflowY: 'auto' }}>
            {leads.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', opacity: 0.6, gap: '0.5rem' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <p style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '1rem' }}>Nenhum lead encontrado neste periodo.</p>
              </div>
            ) : (
              leads.map((lead, idx) => {
                const fStatus = lead.status_funil || 'Lead';
                const stage = stageColors[fStatus] || stageColors['Lead'];
                const dataFormatada = lead.data_entrada
                  ? new Date(lead.data_entrada).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                  : '';
                return (
                  <div key={lead.id || idx}
                    onClick={() => setSelectedLead(lead)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.8rem',
                      padding: '0.85rem 1rem', borderRadius: '12px',
                      backgroundColor: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.06)',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'pointer',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = `${stage.text}55`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 16px -4px rgba(0,0,0,0.3), 0 0 12px ${stage.text}1a`; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'; }}
                  >
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #00b0ff, #00e676)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 800, color: '#0a0a14', boxShadow: 'inset 0 -2px 5px rgba(0,0,0,0.2)' }}>
                      {(lead.nome || lead.id_lead_planilha || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lead.nome || lead.id_lead_planilha || lead.contato || 'Lead sem nome'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{lead.nome && !/^\d+$/.test(lead.nome.replace(/\D/g, '')) ? (lead.contato || '') : ''}</span>
                        {lead.nome && !/^\d+$/.test(lead.nome.replace(/\D/g, '')) && lead.contato && <span style={{color: 'rgba(255,255,255,0.2)'}}>•</span>}
                        <span>{dataFormatada.split(' ')[0]}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                      <div style={{ padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: stage.bg, color: stage.text, whiteSpace: 'nowrap', border: `1px solid ${stage.text}22` }}>
                        {stage.label}
                      </div>
                    </div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: '0.2rem' }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Lead Detail Modal - Reused from App.jsx */}
      {selectedLead && (() => {
        const fStatus = selectedLead.status_funil || 'Lead';
        const stage = stageColors[fStatus] || stageColors['Lead'];
        const dataFormatada = selectedLead.data_entrada
          ? new Date(selectedLead.data_entrada).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
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
              animation: 'fadeIn 0.2s ease-out'
            }}>
              {/* Header band */}
              <div style={{ padding: '1.5rem', background: `linear-gradient(to right, ${stage.bg}, transparent)`, borderBottom: `1px solid ${stage.text}22`, display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                    <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ padding: '0.2rem 0.7rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, background: stage.bg, color: stage.text, border: `1px solid ${stage.text}44`, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        {stage.icon} {stage.label}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{dataFormatada}</span>
                    </div>
                  )}
                </div>
                
                {!isEditingLead && (
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setEditLeadData({
                      nome: selectedLead.nome || '',
                      contato: selectedLead.contato || '',
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
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}
                >✕</button>
              </div>

              {/* Body */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
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
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00b0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.05 1h3a2 2 0 0 1 2 1.72c.13 1.02.37 2.03.71 3-.1.24-.6.78-1.17 1.08a16 16 0 0 0 6.29 6.29c.3-.57.84-1.07 1.08-1.17.97.34 1.98.58 3 .71A2 2 0 0 1 22 16.92z"/></svg>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.1rem', fontWeight: 500 }}>WhatsApp</div>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>{selectedLead.contato}</div>
                        </div>
                      </div>
                    )}

                    {/* Interaction flags */}
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jornada do Lead</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem' }}>
                        {fields.map(f => (
                          <div key={f.label} style={{
                            padding: '1rem 0.8rem', borderRadius: '12px', textAlign: 'center',
                            background: isSim(f.value) ? 'linear-gradient(145deg, rgba(0,230,118,0.1) 0%, rgba(0,230,118,0.05) 100%)' : 'rgba(255,255,255,0.02)',
                            border: isSim(f.value) ? '1px solid rgba(0,230,118,0.25)' : '1px solid rgba(255,255,255,0.06)',
                            boxShadow: isSim(f.value) ? 'inset 0 1px 1px rgba(255,255,255,0.1)' : 'none'
                          }}>
                            <div style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>{f.icon}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.5rem', lineHeight: 1.3, fontWeight: 500 }}>{f.label}</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: isSim(f.value) ? '#00e676' : '#f87171' }}>
                              {f.value || 'Nao'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Observations */}
                    {selectedLead.observacoes && (
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Observações</div>
                        <div style={{ padding: '1rem 1.2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}>
                          <div style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6 }}>{selectedLead.observacoes}</div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
