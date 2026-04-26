const axios = require('axios');

module.exports = async (req, res) => {
    // Only allow POST requests
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const PUBLIC_KEY = 'project_public_166636c0ef06967055a12afe78eaa6da_w3sMdbbf976633154eb57f197e5a6e0498fea';
    
    try {
        const body = req.body;
        let tool = body.tool;
        
        // Mapping UI tool names to official iLovePDF task names
        if (tool === 'pdf') tool = 'officepdf'; 

        // STEP 1: AUTHENTICATION
        // Request a signed token from the auth endpoint
        const authResponse = await axios.post('https://api.ilovepdf.com/v1/auth', {
            public_key: PUBLIC_KEY
        });

        const token = authResponse.data.token;

        // STEP 2: START TASK HANDSHAKE
        // FIXED: Added missing curly brace in template literal and corrected URL to /v1/start/
        const startResponse = await axios.get(`https://api.ilovepdf.com/v1/start/${tool}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Send back the session data (assigned server and task ID)
        res.status(200).json({
            status: "SUCCESS",
            server: startResponse.data.server,
            task: startResponse.data.task
        });

    } catch (err) {
        // Detailed error logging for debugging
        console.error("API_HANDSHAKE_ERROR:", err.response?.data || err.message);
        
        res.status(err.response?.status || 500).json({ 
            error: "HANDSHAKE_FAILED", 
            details: err.response?.data || err.message 
        });
    }
};
