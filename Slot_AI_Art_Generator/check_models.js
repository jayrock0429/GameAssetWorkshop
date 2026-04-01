require('dotenv').config();
const fetch = require('node-fetch');
const key = process.env.GEMINI_API_KEY;

fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
    .then(r => r.json())
    .then(d => {
        const img = d.models.filter(m => m.name.includes('imagen'));
        console.log(JSON.stringify(img.map(m => ({ name: m.name, methods: m.supportedGenerationMethods })), null, 2));
    })
    .catch(e => console.error(e));
