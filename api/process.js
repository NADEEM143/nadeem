const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    // 1. KEY VERIFICATION
    const pub = process.env.ILOVEPDF_PUBLIC_KEY;
    const sec = process.env.ILOVEPDF_SECRET_KEY;

    if (!pub || !sec) {
        console.error("ENGINE_LOG: MISSING_API_KEYS_IN_VERCEL_SETTINGS");
        return res.status(500).json({ status: "ERROR", details: "API Keys not found in Vercel" });
    }

    const instance = new ILovePDFApi(pub, sec);
    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
        if (err || !files.file) return res.status(500).json({ error: "UPLOAD_FAILED" });

        try {
            // 2. TOOL SANITIZATION
            const raw = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            const tool = raw.toLowerCase().trim();
            const file = Array.isArray(files.file) ? files.file[0] : files.file;

            // 3. START ENGINE
            const task = instance.newTask(tool);
            await task.start();
            await task.addFile(file.path);

            // 4. WAIT & PROCESS (Prevents Engine Rejection)
            await new Promise(resolve => setTimeout(resolve, 3000));
            task.process();

            res.status(200).json({ 
                status: "SUCCESS", 
                server: task.server, 
                task: task.id 
            });

        } catch (e) {
            // This will now print the REAL reason in your logs
            console.error("ENGINE_LOG:", e.message || "Unknown Engine Error");
            res.status(500).json({ error: e.message });
        }
    });
};
