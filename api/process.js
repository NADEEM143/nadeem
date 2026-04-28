const axios = require('axios');
const FormData = require('form-data');
const multiparty = require('multiparty');
const fs = require('fs');

export const config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const form = new multiparty.Form();
    
    form.parse(req, async (err, fields, files) => {
        if (err) return res.status(500).json({ error: "PARSE_ERROR" });

        try {
            const tool = fields.tool[0];
            const file = files.file[0];

            // 1. Authenticate (FIXED VARIABLE NAME)
            const authResponse = await axios.post('https://api.ilovepdf.com/v1/auth', {
                public_key: process.env.ILOVEPDF_PUBLIC_KEY,
                secret_key: process.env.ILOVEPDF_SECRET_KEY
            });
            const token = authResponse.data.token;

            // 2. Start Task (FIXED VARIABLE NAME)
            let engineTool = tool === 'pdfword' ? 'pdfocr' : (tool === 'pdf' ? 'officepdf' : tool);
            const startResponse = await axios.get(`https://api.ilovepdf.com/v1/start/${engineTool}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const { server, task } = startResponse.data;

            // 3. Upload File to iLovePDF
            const uploadFormData = new FormData();
            uploadFormData.append('task', task);
            uploadFormData.append('file', fs.createReadStream(file.path));

            await axios.post(`https://${server}/v1/upload`, uploadFormData, {
                headers: { 
                    ...uploadFormData.getHeaders(),
                    'Authorization': `Bearer ${token}`
                }
            });

            // 4. Return session to Frontend
            res.status(200).json({ status: "SUCCESS", server, task, token, tool: engineTool });

        } catch (error) {
            console.error(error.response?.data || error.message);
            res.status(500).json({ status: "ERROR", details: error.message });
        }
    });
};
