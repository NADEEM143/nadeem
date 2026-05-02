const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const instance = new ILovePDFApi(process.env.ILOVEPDF_PUBLIC_KEY, process.env.ILOVEPDF_SECRET_KEY);
    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
        if (err || !files.file || !fields.tool) {
            return res.status(400).json({ error: 'Data missing' });
        }

        try {
            const tool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            const file = Array.isArray(files.file) ? files.file[0] : files.file;

            const task = instance.newTask(tool);
            await task.start();
            
            // 1. UPLOAD: Handled server-to-server (No CORS issues)
            await task.addFile(file.path);

            // 2. TRIGGER PROCESS: We do NOT 'await' this
            // This allows the server to finish in 2 seconds, beating Vercel's limit
            task.process(); 

            // 3. RESPOND IMMEDIATELY
            return res.status(200).json({
                status: 'SUCCESS',
                server: task.server,
                task: task.id
            });

        } catch (error) {
            console.error('ENGINE_ERROR:', error.message);
            return res.status(500).json({ error: error.message });
        }
    });
};
