const axios = require('axios');
const FormData = require('form-data');
const multiparty = require('multiparty');
const fs = require('fs');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    const form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
        if (err || !files.file) return res.status(500).json({ status: "ERROR", details: "File missing" });

        try {
            const tool = fields.tool[0];
            const file = files.file[0];

            // 1. Authenticate
            const authRes = await axios.post('https://api.ilovepdf.com/v1/auth', {
                public_key: process.env.ILOVEPDF_PUBLIC_KEY,
                secret_key: process.env.ILOVEPDF_SECRET_KEY
            });
            const token = authRes.data.token;

            // 2. Start Task (FIXED: Mapping engine names)
            let engineTool = tool === 'pdfword' ? 'pdfword' : tool;
            const startRes = await axios.get(`https://api.ilovepdf.com/v1/start/${engineTool}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const { server, task } = startRes.data;

            // 3. Upload File
            const uploadFormData = new FormData();
            uploadFormData.append('task', task);
            uploadFormData.append('file', fs.createReadStream(file.path));

            await axios.post(`https://${server}/v1/upload`, uploadFormData, {
                headers: { ...uploadFormData.getHeaders(), 'Authorization': `Bearer ${token}` }
            });

            // --- CRITICAL FIX: 2.5 Second Safety Delay ---
            // This stops the 'Task can't be processed' error
            await new Promise(resolve => setTimeout(resolve, 2500));

            // 4. Process
            await axios.post(`https://${server}/v1/process`, { 
                task: task, 
                tool: engineTool 
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            res.status(200).json({ status: "SUCCESS", server, task });

        } catch (error) {
            console.error("ILOVEPDF_ERROR:", error.response?.data || error.message);
            res.status(500).json({ status: "ERROR", details: error.response?.data || error.message });
        }
    });
};
