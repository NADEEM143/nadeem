const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const PUBLIC_KEY = process.env.ILOVEPDF_PUBLIC_KEY;
    const SECRET_KEY = process.env.ILOVEPDF_SECRET_KEY;
    
    try {
        const { tool = 'officepdf' } = req.body;
        
        // STEP 1: AUTHENTICATION
        const authResponse = await axios.post('https://api.ilovepdf.com/v1/auth', {
            public_key: PUBLIC_KEY,
            secret_key: SECRET_KEY
        }, { timeout: 10000 });

        const token = authResponse.data.token;

        // STEP 2: TOOL MAPPING
        let engineTool = tool;
        if (tool === 'pdfword') engineTool = 'pdfocr';
        if (tool === 'pdf') engineTool = 'officepdf';

        // STEP 3: START TASK
        const startResponse = await axios.get(`https://api.ilovepdf.com/v1/start/${engineTool}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 10000
        });

        res.status(200).json({
            status: "SUCCESS",
            server: startResponse.data.server,
            task: startResponse.data.task,
            token: token,
            tool: engineTool
        });

    } catch (err) {
        console.error("LOG_ERROR:", err.response?.data || err.message);
        res.status(500).json({ error: "HANDSHAKE_FAILED", details: err.message });
    }
};
