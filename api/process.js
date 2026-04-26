const axios = require('axios');

module.exports = async (req, res) => {
    // Only allow POST requests
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    // Pulling keys from Vercel Environment Variables (as we set up in the dashboard)
    const PUBLIC_KEY = process.env.ILOVEPDF_PUBLIC_KEY;
    const SECRET_KEY = process.env.ILOVEPDF_SECRET_KEY;
    
    try {
        const body = req.body;
        let tool = body.tool;
        
        // Mapping UI tool names to official iLovePDF task names
        if (tool === 'pdf') tool = 'officepdf'; 

        // STEP 1: AUTHENTICATION
        // Request a signed token using both Public and Secret keys for full access
        const authResponse = await axios.post('https://api.ilovepdf.com/v1/auth', {
            public_key: PUBLIC_KEY,
            secret_key: SECRET_KEY
        });

        const token = authResponse.data.token;

        // STEP 2: START TASK HANDSHAKE
        // This uses the correct api subdomain and injects the 'tool' variable properly
        const startResponse = await axios.get(`https://api.ilovepdf.com/v1/start/${tool}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Send back the session data (assigned server and task ID)
        res.status(200).json({
            status: "SUCCESS",
            server: startResponse.data.server,
            task: startResponse.data.task,
            token: token // Sending token back in case your frontend needs it for upload
        });

    } catch (err) {
        // Detailed error logging for debugging in Vercel
        console.error("API_HANDSHAKE_ERROR:", err.response?.data || err.message);
        
        res.status(err.response?.status || 500).json({ 
            error: "HANDSHAKE_FAILED", 
            details: err.response?.data || err.message 
        });
    }
};