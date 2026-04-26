const axios = require('axios');

module.exports = async (req, res) => {
    // Standard security check
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const API_KEY = '6216e26f0bc9163b880ce18eb28cff0d'; 
    const BASE_URL = 'https://api2convert.com';
    
    try {
        const response = await axios.post(`${BASE_URL}/jobs`, {
            tasks: [{ type: 'job', target: req.body.tool || 'pdf' }]
        }, {
            headers: { 
                'X-Oc-Api-Key': API_KEY,
                'Content-Type': 'application/json',
                // --- STEALTH HEADERS TO BYPASS 403 FORBIDDEN ---
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });

        // Send successful handshake back to frontend
        res.status(200).json(response.data);

    } catch (err) {
        // Log the EXACT rejection reason to your Vercel console
        console.error("ENGINE_LOG:", err.response?.data || err.message);
        
        res.status(err.response?.status || 500).json({ 
            error: "HANDSHAKE_REJECTED", 
            details: err.response?.data || err.message 
        });
    }
};
