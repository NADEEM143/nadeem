const axios = require('axios');

module.exports = async (req, res) => {
    // Vercel uses (req, res) instead of (event)
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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
            }
        });

        res.status(200).json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json({ 
            error: "HANDSHAKE_ERROR", 
            details: err.response?.data || err.message 
        });
    }
};
