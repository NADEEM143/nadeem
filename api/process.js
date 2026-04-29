const axios = require('axios');
const FormData = require('form-data');
const multiparty = require('multiparty');
const fs = require('fs');

// Required for Vercel to handle file uploads
module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
        // Correctly extract tool and file from multiparty arrays
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

            // 2. START TASK (Official Production Engine Names)
            let engineTool = tool;
            if (tool === 'officepdf') engineTool = 'officepdf'; // Word to PDF
            if (tool === 'pdfword') engineTool = 'pdfword';     // PDF to Word
            if (tool === 'compress') engineTool = 'compress';   // Compression
            
            const startRes = await axios.get(`https://api.ilovepdf.com/v1/start/${engineTool}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const { server, task } = startRes.data;

            // 3. UPLOAD ASSET (Server-to-Server)
            const uploadFormData = new FormData();
            uploadFormData.append('task', task);
            uploadFormData.append('file', fs.createReadStream(file.path));

            await axios.post(`https://${server}/v1/upload`, uploadFormData, {
                headers: { 
                    ...uploadFormData.getHeaders(), 
                    'Authorization': `Bearer ${token}` 
                }
            });

            // 4. THE 3-SECOND SAFETY BUFFER
            // This is the CRITICAL fix for the "Task can't be processed" error
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 5. EXECUTE ENGINE (Deducts 1 Credit)
            await axios.post(`https://${server}/v1/process`, { 
                task: task, 
                tool: engineTool 
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // 6. SEND SUCCESS DATA BACK TO FRONTEND
            res.status(200).json({ status: "SUCCESS", server, task });

        } catch (error) {
            // Logs the exact reason for failure in your Vercel Dashboard
            console.error("ENGINE_LOG:", error.response?.data || error.message);
            res.status(500).json({ status: "ERROR", details: error.response?.data || error.message });
        }
    });
};
