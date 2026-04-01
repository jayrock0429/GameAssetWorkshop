const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testImagen() {
    console.log("Testing Imagen 4.0 API...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${GEMINI_API_KEY}`;
    
    const body = {
        instances: [{ prompt: "A luxury 3D casino slot symbol of a gold coin, pure black background" }],
        parameters: {
            sampleCount: 1,
            aspectRatio: "1:1"
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        
        console.log("Status:", response.status);
        const data = await response.json();
        
        if (data.predictions && data.predictions.length > 0) {
            console.log("SUCCESS! Got image data, length:", data.predictions[0].bytesBase64Encoded.length);
        } else {
            console.log("Raw Response Data:", JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

testImagen();
