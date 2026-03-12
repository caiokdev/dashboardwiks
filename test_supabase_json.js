import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mcyuqwrbmvvmofbvhrph.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jeXVxd3JibXZ2bW9mYnZocnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDMwMjgsImV4cCI6MjA4ODgxOTAyOH0.jrSaQbZ1Lirj7QijMnaN-myEHoHt4j79uVPNrzXPgaE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    let results = {};
    
    const tables = ['cliente', 'clientes', 'metricas_semanais', 'metricas', 'usuarios'];
    
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(2);
        results[table] = {
            hasData: data ? data.length > 0 : false,
            data: data,
            error: error ? error.message : null
        };
    }
    
    fs.writeFileSync('db_results.json', JSON.stringify(results, null, 2));
    console.log("Done");
}
main();
