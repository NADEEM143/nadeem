const axios = require('axios');
const multiparty = require('multiparty');
const fs = require('fs');
const FormData = require('form-data');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    const form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
        if (err || !files.file) return res.status(500).json({ error: "FILE_MISSING" });

        try {
            // 1. TOOL MAPPING
            const rawTool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            let engineTool = rawTool.toLowerCase().trim();
            if (engineTool === 'pdfword') engineTool = 'pdfword';
            
            const file = files.file[0];

            // 2. AUTHENTICATION (Correct URL)
            const auth = await axios.post('https://api.ilovepdf.com/v1/auth', {
                public_key: process.env.ILOVEPDF_PUBLIC_KEY,
                secret_key: process.env.ILOVEPDF_SECRET_KEY
            });
            const token = auth.data.token;

            // 3. START TASK (Correct URL)
            const start = await axios.get(`https://api.ilovepdf.com/v1/start/${engineTool}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const { server, task } = start.data;

            // 4. UPLOAD FILE (Physical Binary Transfer)
            const fd = new FormData();
            fd.append('task', task);
            fd.append('file', fs.createReadStream(file.path));

            await axios.post(`https://${server}/v1/upload`, fd, {
                headers: { ...fd.getHeaders(), 'Authorization': `Bearer ${token}` }
            });

            // 5. PROCESS (Trigger and move on)
            axios.post(`https://${server}/v1/process`, { task, tool: engineTool }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // 6. SUCCESS
            res.status(200).json({ status: "SUCCESS", server, task });

        } catch (e) {
            const msg = e.response?.data || e.message;
            console.error("DIAGNOSTIC_LOG:", msg);
            res.status(500).json({ status: "ERROR", details: msg });
        }
    });
};
