import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mcyuqwrbmvvmofbvhrph.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jeXVxd3JibXZ2bW9mYnZocnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDMwMjgsImV4cCI6MjA4ODgxOTAyOH0.jrSaQbZ1Lirj7QijMnaN-myEHoHt4j79uVPNrzXPgaE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // Tenta pegar dados da tabela "cliente"
    const { data: clienteData, error: clienteError } = await supabase.from('cliente').select('*').limit(5);
    console.log('Tabela cliente:');
    console.log(clienteData, clienteError);

    // Tenta pegar dados da tabela "metricas_semanais"
    const { data: metricasData, error: metricasError } = await supabase.from('metricas_semanais').select('*').limit(5);
    console.log('Tabela metricas_semanais:');
    console.log(metricasData, metricasError);

    // Lista todas as tabelas buscando via view ou função, ou apenas tentando as mais prováveis.
    // O Supabase tem uma view chamada information_schema.tables mas o role anon pode não ter acesso.
    
    // Tabela usuarios
    const { data: userData, error: userError } = await supabase.from('usuarios').select('*').limit(5);
    console.log('Tabela usuarios:');
    console.log(userData, userError);
}

main();
