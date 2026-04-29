const axios = require('axios');
const FormData = require('form-data');
const multiparty = require('multiparty');
const fs = require('fs');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    const form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
        if (err || !files.file || !files.file[0]) {
            return res.status(500).json({ status: "ERROR", details: "File missing" });
        }

        try {
            const tool = fields.tool[0];
            const file = files.file[0];

            // 1. AUTHENTICATION
            const authRes = await axios.post('https://api.ilovepdf.com/v1/auth', {
                public_key: process.env.ILOVEPDF_PUBLIC_KEY,
                secret_key: process.env.ILOVEPDF_SECRET_KEY
            });
            const token = authRes.data.token;

            // 2. START TASK (Synchronized with GitHub naming)
            // The library expects 'officepdf' for Word and 'pdfword' for PDF to Word
            let engineTool = (tool === 'officepdf') ? 'officepdf' : 
                             (tool === 'pdfword' ? 'pdfword' : tool);

            const startRes = await axios.get(`https://api.ilovepdf.com/v1/start/${engineTool}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const { server, task } = startRes.data;

            // 3. UPLOAD ASSET
            const uploadFormData = new FormData();
            uploadFormData.append('task', task);
            uploadFormData.append('file', fs.createReadStream(file.path));

            await axios.post(`https://${server}/v1/upload`, uploadFormData, {
                headers: { 
                    ...uploadFormData.getHeaders(), 
                    'Authorization': `Bearer ${token}` 
                }
            });

            // --- SAFETY BUFFER TO PREVENT PROCESSINGERROR ---
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 4. EXECUTE ENGINE
            await axios.post(`https://${server}/v1/process`, { 
                task: task, 
                tool: engineTool 
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // 5. SEND SUCCESS DATA
            res.status(200).json({ status: "SUCCESS", server, task });

        } catch (error) {
            console.error("ENGINE_FAILURE:", error.response?.data || error.message);
            res.status(500).json({ status: "ERROR", details: error.response?.data || error.message });
        }
    });
};
