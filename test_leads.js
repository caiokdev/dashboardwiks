import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mcyuqwrbmvvmofbvhrph.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jeXVxd3JibXZ2bW9mYnZocnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDMwMjgsImV4cCI6MjA4ODgxOTAyOH0.jrSaQbZ1Lirj7QijMnaN-myEHoHt4j79uVPNrzXPgaE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: leads, error } = await supabase.from('leads_clientes').select('*');
    if (error) {
        fs.writeFileSync('leads_info.json', JSON.stringify({error: error.message}));
        return;
    }
    
    // Contar status_funil
    const counts = {};
    const clientes = new Set();
    
    leads.forEach(lead => {
        clientes.add(lead.id_cliente);
        const status = lead.status_funil;
        counts[status] = (counts[status] || 0) + 1;
    });
    
    fs.writeFileSync('leads_info.json', JSON.stringify({
        total: leads.length,
        counts,
        clientes: Array.from(clientes),
        sample: leads.slice(0, 2)
    }, null, 2));
}

main();
