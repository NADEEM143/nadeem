const axios = require('axios');
const multiparty = require('multiparty');
const fs = require('fs');
const FormData = require('form-data');

// Vercel config to allow binary file uploads
module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    // 1. ADD CORS HEADERS (Bypasses browser restrictions)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
        // Validation
        if (err || !files.file || !fields.tool) {
            return res.status(400).json({ error: "Missing file or tool data" });
        }

        try {
            const rawTool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            const tool = rawTool.toLowerCase().trim();
            const file = files.file[0] || files.file;

            // STEP 1: AUTHENTICATION
            const auth = await axios.post('https://api.ilovepdf.com/v1/auth', {
                public_key: process.env.ILOVEPDF_PUBLIC_KEY,
                secret_key: process.env.ILOVEPDF_SECRET_KEY
            });
            const token = auth.data.token;

            // STEP 2: START TASK
            const start = await axios.get(`https://api.ilovepdf.com/v1/start/${tool}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const { server, task } = start.data;

            // STEP 3: THE "PERSONAL SERVER" UPLOAD (Bypasses iLovePDF's CORS bug)
            const fd = new FormData();
            fd.append('task', task);
            fd.append('file', fs.createReadStream(file.path));

            await axios.post(`https://${server}/v1/upload`, fd, {
                headers: { ...fd.getHeaders(), 'Authorization': `Bearer ${token}` }
            });

            // STEP 4: TRIGGER PROCESS (Do not 'await' to beat Vercel's 10s limit)
            axios.post(`https://${server}/v1/process`, { task, tool }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // STEP 5: SUCCESS RESPONSE
            res.status(200).json({
                status: "SUCCESS",
                server: server,
                task: task
            });

        } catch (e) {
            const msg = e.response?.data || e.message;
            console.error("BRIDGE_ERROR:", msg);
            res.status(500).json({ error: msg });
        }
    });
};
