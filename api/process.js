const axios = require('axios');
const FormData = require('form-data');
const multiparty = require('multiparty');
const fs = require('fs');

// FIXED: Correct Vercel configuration syntax
module.exports.config = {
    api: { bodyParser: false }
};

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const form = new multiparty.Form();
    
    form.parse(req, async (err, fields, files) => {
        if (err || !files.file) return res.status(500).json({ error: "FILE_ERROR" });

        try {
            const tool = fields.tool[0];
            const file = files.file[0];

            // 1. Authenticate
            const authRes = await axios.post('https://api.ilovepdf.com/v1/auth', {
                public_key: process.env.ILOVEPDF_PUBLIC_KEY,
                secret_key: process.env.ILOVEPDF_SECRET_KEY
            });
            const token = authRes.data.token;

            // 2. Start Task
            let engineTool = tool === 'pdfword' ? 'pdfocr' : (tool === 'pdf' ? 'officepdf' : tool);
            const startRes = await axios.get(`https://api.ilovepdf.com/v1/start/${engineTool}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const { server, task } = startRes.data;

            // 3. Upload File (Server-to-Server)
            const uploadFormData = new FormData();
            uploadFormData.append('task', task);
            uploadFormData.append('file', fs.createReadStream(file.path));

            await axios.post(`https://${server}/v1/upload`, uploadFormData, {
                headers: { 
                    ...uploadFormData.getHeaders(),
                    'Authorization': `Bearer ${token}`
                }
            });

            // 4. Final Processing (CRITICAL: Done on server to stop 403 error)
            await axios.post(`https://${server}/v1/process`, {
                task: task,
                tool: engineTool,
                pdfocr_convert_to: tool === 'pdfword' ? 'docx' : undefined
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // 5. Send Success back to browser
            res.status(200).json({ status: "SUCCESS", server, task });

        } catch (error) {
            console.error("SERVER_LOG:", error.response?.data || error.message);
            res.status(500).json({ status: "ERROR", details: error.message });
        }
    });
};
