const axios = require('axios');
const multiparty = require('multiparty');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    // 1. ADD CORS HEADERS (The fix recommended by iLovePDF Support)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
        if (err || !fields.tool) return res.status(400).json({ error: "No tool selected" });

        try {
            // Pick the tool out of the Vercel array
            const rawTool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;

            // 2. THE MASTER MAPPER
            // This ensures the engine receives the official ID (e.g., 'officepdf')
            const toolMap = {
                'officepdf': 'officepdf',
                'pdfword': 'pdfocr',
                'compress': 'compress',
                'imagepdf': 'imagepdf'
            };
            
            const tool = toolMap[rawTool.toLowerCase().trim()] || rawTool.toLowerCase().trim();

            // 3. AUTHENTICATION
            const auth = await axios.post('https://api.ilovepdf.com/v1/auth', {
                public_key: process.env.ILOVEPDF_PUBLIC_KEY,
                secret_key: process.env.ILOVEPDF_SECRET_KEY
            });
            const token = auth.data.token;

            // 4. START TASK (Fixed variable name to 'tool')
            const start = await axios.get(`https://api.ilovepdf.com/v1/start/${tool}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // 5. SUCCESS
            res.status(200).json({
                status: "SUCCESS",
                token: token,
                server: start.data.server,
                task: start.data.task
            });

        } catch (e) {
            const msg = e.response?.data || e.message;
            console.error("PROXY_ERROR:", msg);
            res.status(500).json({ error: msg });
        }
    });
};
