const axios = require('axios');
const multiparty = require('multiparty');
const fs = require('fs');
const FormData = require('form-data');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    const form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
        if (err || !files.file) return res.status(500).json({ error: "UPLOAD_FAILED" });

        try {
            const tool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            const file = files.file[0];

            // 1. AUTHENTICATION
            const auth = await axios.post('https://ilovepdf.com', {
                public_key: process.env.ILOVEPDF_PUBLIC_KEY,
                secret_key: process.env.ILOVEPDF_SECRET_KEY
            });
            const token = auth.data.token;

            // 2. START TASK
            const start = await axios.get(`https://ilovepdf.com{tool}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const { server, task } = start.data;

            // 3. UPLOAD FILE
            const fd = new FormData();
            fd.append('task', task);
            fd.append('file', fs.createReadStream(file.path));

            await axios.post(`https://${server}/v1/upload`, fd, {
                headers: { ...fd.getHeaders(), 'Authorization': `Bearer ${token}` }
            });

            // 4. PROCESS (Asynchronous - No 'await' to beat Vercel timeout)
            axios.post(`https://${server}/v1/process`, { task, tool }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // 5. SUCCESS RESPONSE
            res.status(200).json({ status: "SUCCESS", server, task });

        } catch (e) {
            // THIS IS THE FIX: It will now print the REAL error message in your Vercel logs
            const detailedError = e.response?.data || e.message;
            console.error("DIAGNOSTIC_LOG:", detailedError);
            res.status(500).json({ status: "ERROR", details: detailedError });
        }
    });
};
