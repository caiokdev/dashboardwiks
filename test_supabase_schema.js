import https from 'https';
import fs from 'fs';

const url = 'https://mcyuqwrbmvvmofbvhrph.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jeXVxd3JibXZ2bW9mYnZocnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDMwMjgsImV4cCI6MjA4ODgxOTAyOH0.jrSaQbZ1Lirj7QijMnaN-myEHoHt4j79uVPNrzXPgaE';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        fs.writeFileSync('supabase_schema.json', data);
        console.log("Schema saved to supabase_schema.json");
    });
}).on('error', (err) => {
    console.error("Error: " + err.message);
});
