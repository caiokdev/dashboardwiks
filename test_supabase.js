import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://btwbwlaodbuxmelcbunr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0d2J3bGFvZGJ1eG1lbGNidW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDM2NjcsImV4cCI6MjA3MDA3OTY2N30.XSwGXfSWv_mWRtRmU_M2gse15Bw3ljFS05jf0fDMJrE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('metricas_semanais').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Row:', data[0]);
  }
}

test();
