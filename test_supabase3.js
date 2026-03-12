import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mcyuqwrbmvvmofbvhrph.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jeXVxd3JibXZ2bW9mYnZocnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDMwMjgsImV4cCI6MjA4ODgxOTAyOH0.jrSaQbZ1Lirj7QijMnaN-myEHoHt4j79uVPNrzXPgaE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching cliente...");
    const { data: cData, error: cErr } = await supabase.from('cliente').select('*').limit(1);
    console.log("cliente error:", cErr?.message || "none");
    if(cData) console.log("cliente count:", cData.length > 0 ? "has data" : "empty");

    console.log("Fetching clientes...");
    const { data: csData, error: csErr } = await supabase.from('clientes').select('*').limit(1);
    console.log("clientes error:", csErr?.message || "none");
    if(csData) console.log("clientes count:", csData.length > 0 ? "has data" : "empty");

    console.log("Fetching metricas_semanais...");
    const { data: mData, error: mErr } = await supabase.from('metricas_semanais').select('*').limit(1);
    console.log("metricas_semanais error:", mErr?.message || "none");
    if(mData) console.log("metricas_semanais count:", mData.length > 0 ? "has data" : "empty");

    console.log("Fetching metricas...");
    const { data: metData, error: metErr } = await supabase.from('metricas').select('*').limit(1);
    console.log("metricas error:", metErr?.message || "none");
    if(metData) console.log("metricas count:", metData.length > 0 ? "has data" : "empty");
}
main();
