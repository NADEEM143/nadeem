const axios = require('axios');

module.exports = async (req, res) => {
    // Only allow POST requests from your frontend
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    // Pulling keys from Vercel Environment Variables
    const PUBLIC_KEY = process.env.ILOVEPDF_PUBLIC_KEY;
    const SECRET_KEY = process.env.ILOVEPDF_SECRET_KEY;
    
    try {
        const body = req.body;
        let tool = body.tool || 'officepdf';
        
               // --- FINAL STICK TOOL MAPPING ---
        if (tool === 'pdf') tool = 'officepdf'; 
        
        // This is the critical change: trying the secondary API name
        if (tool === 'pdfword') tool = 'pdfdocx'; 
        
        if (tool === 'compress') tool = 'compress';
        if (tool === 'imagepdf') tool = 'imagepdf';


        // STEP 1: AUTHENTICATION
        // We send both keys to get a "High Privilege" token for tools like pdfword
        const authResponse = await axios.post('https://api.ilovepdf.com/v1/auth', {
            public_key: PUBLIC_KEY,
            secret_key: SECRET_KEY
        });

        const token = authResponse.data.token;

        // STEP 2: START TASK HANDSHAKE
        // Uses backticks (`) to properly inject the tool name into the URL
        const startResponse = await axios.get(`https://api.ilovepdf.com/v1/start/${tool}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Send back the session data to your frontend
        res.status(200).json({
            status: "SUCCESS",
            server: startResponse.data.server,
            task: startResponse.data.task,
            token: token 
        });

    } catch (err) {
        // Detailed error logging for your Vercel Dashboard
        console.error("API_HANDSHAKE_ERROR:", err.response?.data || err.message);
        
        res.status(err.response?.status || 500).json({
            status: "ERROR",
            error: "HANDSHAKE_FAILED",
            details: err.response?.data || err.message
        });
    }
};
