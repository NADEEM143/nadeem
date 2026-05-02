const axios = require('axios');
const multiparty = require('multiparty');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    // 1. ADD THE MISSING HEADER (iLovePDF's recommended fix)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

    const form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
        if (err || !fields.tool) return res.status(500).json({ error: "Data missing" });

        try {
            const tool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;

            // 2. AUTHENTICATION
            const auth = await axios.post('https://ilovepdf.com', {
                public_key: process.env.ILOVEPDF_PUBLIC_KEY,
                secret_key: process.env.ILOVEPDF_SECRET_KEY
            });
            const token = auth.data.token;

            // 3. START TASK
            const start = await axios.get(`https://ilovepdf.com{tool}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // 4. SUCCESS: Return the Token and Server to the browser
            // Now the browser can upload directly because your server "authorized" it
            res.status(200).json({
                status: "SUCCESS",
                token: token,
                server: start.data.server,
                task: start.data.task
            });

        } catch (e) {
            console.error("PROXY_ERROR:", e.message);
            res.status(500).json({ error: e.message });
        }
    });
};
