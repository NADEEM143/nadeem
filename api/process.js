const axios = require('axios');
const FormData = require('form-data');
const multiparty = require('multiparty');
const fs = require('fs');

// Vercel config to allow file uploads
module.exports.config = {
    api: { bodyParser: false }
};

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const form = new multiparty.Form();
    
    form.parse(req, async (err, fields, files) => {
        if (err || !files.file) return res.status(500).json({ error: "UPLOAD_FAILED" });

        try {
            const tool = fields.tool[0];
            const file = files.file[0];

            // 1. AUTHENTICATION
            const authRes = await axios.post('https://api.ilovepdf.com/v1/auth', {
                public_key: process.env.ILOVEPDF_PUBLIC_KEY,
                secret_key: process.env.ILOVEPDF_SECRET_KEY
            });
            const token = authRes.data.token;

            // 2. START TASK
            let engineTool = tool === 'pdfword' ? 'pdfocr' : tool;
            const startRes = await axios.get(`https://api.ilovepdf.com/v1/start/${engineTool}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const { server, task } = startRes.data;

            // 3. UPLOAD FILE (Server-to-Server)
            const uploadFd = new FormData();
            uploadFd.append('task', task);
            uploadFd.append('file', fs.createReadStream(file.path));

            await axios.post(`https://${server}/v1/upload`, uploadFd, {
                headers: { ...uploadFd.getHeaders(), 'Authorization': `Bearer ${token}` }
            });

            // 4. PROCESS (This deducts your credit)
            await axios.post(`https://${server}/v1/process`, { 
                task, 
                tool: engineTool,
                pdfocr_convert_to: tool === 'pdfword' ? 'docx' : undefined 
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // 5. RETURN DOWNLOAD INFO
            res.status(200).json({ status: "SUCCESS", server, task });

        } catch (error) {
            console.error("SERVER_ERROR:", error.response?.data || error.message);
            res.status(500).json({ status: "ERROR", details: error.message });
        }
    });
};
