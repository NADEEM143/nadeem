const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    const PUBLIC_KEY = process.env.ILOVEPDF_PUBLIC_KEY;
    const SECRET_KEY = process.env.ILOVEPDF_SECRET_KEY;

    try {
        let { tool = 'officepdf' } = req.body;

        // ✅ Validate tool
        const allowedTools = ['officepdf', 'pdfoffice', 'compress', 'pdfocr'];
        if (!allowedTools.includes(tool)) {
            return res.status(400).json({ error: "INVALID_TOOL" });
        }

        // ✅ Map tool correctly
        let engineTool = tool;
        if (tool === 'pdfword') engineTool = 'pdfoffice';

        // STEP 1: AUTH
        const authResponse = await axios.post(
            'https://api.ilovepdf.com/v1/auth',
            {
                public_key: PUBLIC_KEY,
                secret_key: SECRET_KEY
            },
            { timeout: 10000 }
        );

        const token = authResponse.data.token;

        // STEP 2: START TASK (FIXED: POST)
        const startResponse = await axios.post(
            `https://api.ilovepdf.com/v1/start/${engineTool}`,
            {},
            {
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 10000
            }
        );

        res.status(200).json({
            status: "SUCCESS",
            server: startResponse.data.server,
            task: startResponse.data.task,
            token: token,
            tool: engineTool
        });

    } catch (err) {
        console.error("LOG_ERROR:", err.response?.data || err.message);

        if (err.code === 'ECONNABORTED') {
            return res.status(504).json({ error: "TIMEOUT" });
        }

        res.status(500).json({
            error: "HANDSHAKE_FAILED",
            details: err.response?.data || err.message
        });
    }
};
