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
            const rawTool = fields.tool[0];
            const file = files.file[0];

            // 1. AUTHENTICATION
            const authRes = await axios.post('https://api.ilovepdf.com/v1/auth', {
                public_key: process.env.ILOVEPDF_PUBLIC_KEY,
                secret_key: process.env.ILOVEPDF_SECRET_KEY
            });
            const token = authRes.data.token;

            // 2. OFFICIAL TOOL MAPPING (Matches GitHub repository logic)
            let engineTool = "";
            if (rawTool === "officepdf") engineTool = "officepdf";   // Word to PDF
            if (rawTool === "pdfword") engineTool = "pdfword";       // PDF to Word
            if (rawTool === "compress") engineTool = "compress";     // Compress
            if (rawTool === "imagepdf") engineTool = "imagepdf";     // Image to PDF
            
            // Safety check: if mapping fails, use the raw tool name
            if (!engineTool) engineTool = rawTool;

            // 3. START TASK
            const startRes = await axios.get(`https://api.ilovepdf.com/v1/start/${engineTool}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const { server, task } = startRes.data;

            // 4. UPLOAD ASSET
            const uploadFormData = new FormData();
            uploadFormData.append('task', task);
            uploadFormData.append('file', fs.createReadStream(file.path));

            await axios.post(`https://${server}/v1/upload`, uploadFormData, {
                headers: { ...uploadFormData.getHeaders(), 'Authorization': `Bearer ${token}` }
            });

            // 5. SAFETY DELAY (Wait for server sync)
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 6. EXECUTE PROCESS
            await axios.post(`https://${server}/v1/process`, { 
                task: task, 
                tool: engineTool 
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // 7. SUCCESS
            res.status(200).json({ status: "SUCCESS", server, task });

        } catch (error) {
            console.error("ENGINE_LOG:", error.response?.data || error.message);
            res.status(500).json({ status: "ERROR", details: error.response?.data || error.message });
        }
    });
};
