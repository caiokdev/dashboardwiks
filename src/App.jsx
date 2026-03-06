import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './index.css';

// Credenciais do Supabase configuradas com a URL da API e a Chave Anon
const supabaseUrl = 'https://btwbwlaodbuxmelcbunr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0d2J3bGFvZGJ1eG1lbGNidW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDM2NjcsImV4cCI6MjA3MDA3OTY2N30.XSwGXfSWv_mWRtRmU_M2gse15Bw3ljFS05jf0fDMJrE';
const supabase = createClient(supabaseUrl, supabaseKey);

// Nome da tabela atualizado
const NOME_DA_TABELA = 'metricas_semanais';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{label}</p>
        <p className="value">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function DashboardLeads() {
  const [dadosBrutos, setDadosBrutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [kpiData, setKpiData] = useState({ leads: 0, saudacoes: 0, conversas: 0, agendamentos: 0 });
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    processarDadosDoCliente();
  }, [clienteSelecionado, dadosBrutos]);

  const carregarDados = async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from(NOME_DA_TABELA)
      .select('*');

    if (error) {
      console.error('Erro ao buscar dados:', error);
      setCarregando(false);
      return;
    }

    setDadosBrutos(data);

    // Extrai a lista de clientes únicos para o select
    const clientesUnicos = [...new Set(data.map(item => item.id_cliente))];
    setClientes(clientesUnicos);

    // Seleciona o primeiro cliente por padrão, se existir
    if (clientesUnicos.length > 0) {
      setClienteSelecionado(clientesUnicos[0]);
    }
    setCarregando(false);
  };

  const processarDadosDoCliente = () => {
    if (!clienteSelecionado || dadosBrutos.length === 0) return;

    // Filtra as linhas do cliente escolhido
    const linhasDoCliente = dadosBrutos.filter(item => item.id_cliente === clienteSelecionado);

    // Soma as métricas caso tenha mais de uma linha (ex: múltiplas semanas)
    let leads = 0, saudacoes = 0, conversas = 0, agendamentos = 0;

    linhasDoCliente.forEach(linha => {
      leads += linha.total_leads || 0;
      saudacoes += linha.saudacoes_respondidas || 0;
      conversas += linha.conversas_continuadas || 0;
      agendamentos += linha.total_agendamentos || 0;
    });

    setKpiData({ leads, saudacoes, conversas, agendamentos });

    // Formata os dados para a biblioteca Recharts (Funil com Área)
    setDadosGrafico([
      { etapa: '1. Leads', valor: leads },
      { etapa: '2. Saudações', valor: saudacoes },
      { etapa: '3. Conversas', valor: conversas },
      { etapa: '4. Agendamentos', valor: agendamentos },
    ]);
  };

  if (carregando) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">Carregando métricas...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <h1 className="dashboard-title">Conversões & Leads</h1>
        <div className="client-selector-container">
          <label className="client-selector-label">Cliente:</label>
          <select
            className="client-select"
            value={clienteSelecionado}
            onChange={(e) => setClienteSelecionado(e.target.value)}
          >
            {clientes.map(cliente => (
              <option key={cliente} value={cliente}>{cliente}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flexGrow: 1 }}>
        {/* KPI Cards Grid */}
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

        {/* Big Chart Area */}
        <section className="chart-container-wrapper">
          <div className="chart-header">
            <h2 className="chart-title">Análise do Funil</h2>
            <p className="chart-subtitle">Taxa de retenção do usuário da captura ao agendamento</p>
          </div>
          <div style={{ width: '100%', height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dadosGrafico}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="etapa"
                  axisLine={false}
                  tickLine={false}
                  stroke="#94a3b8"
                  dy={10}
                  tick={{ fontSize: 14, fontWeight: 500 }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  stroke="#94a3b8"
                  tick={{ fontSize: 14 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke="#3b82f6"
                  strokeWidth={4}
                  fillOpacity={0.8}
                  fill="#3b82f6"
                  activeDot={{ r: 8, fill: '#60a5fa', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </main>
    </div>
  );
}
