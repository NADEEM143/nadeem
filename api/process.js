const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    const instance = new ILovePDFApi(process.env.ILOVEPDF_PUBLIC_KEY, process.env.ILOVEPDF_SECRET_KEY);
    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
        if (err || !files.file) return res.status(500).json({ error: "UPLOAD_FAILED" });

        try {
            // Standardize tool name
            const raw = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            const tool = raw.toLowerCase().replace(/[^a-z]/g, '');
            
            const file = Array.isArray(files.file) ? files.file[0] : files.file;

            // 1. Initialize Task
            const task = instance.newTask(tool);
            
            // 2. Start & Upload
            await task.start();
            await task.addFile(file.path);

            // --- THE TINY THING: FORCE SYNC DELAY ---
            // We wait 3 seconds to let the iLovePDF server 'catch' the file binary
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 3. Trigger Process (Do NOT 'await' to avoid Vercel 10s timeout)
            task.process();

            // 4. Success Response
            res.status(200).json({ 
                status: "SUCCESS", 
                server: task.server, 
                task: task.id 
            });

        } catch (e) {
            console.error("ENGINE_LOG:", e.message);
            res.status(500).json({ error: e.message });
        }
    });
};
