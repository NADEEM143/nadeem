const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const instance = new ILovePDFApi(process.env.ILOVEPDF_PUBLIC_KEY, process.env.ILOVEPDF_SECRET_KEY);
    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
        if (err || !files || !files.file) {
            return res.status(500).json({ status: "ERROR", details: "File missing" });
        }

        try {
            // --- SAFETY MAP ---
            const rawTool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            
            // Map your frontend clicks to the official library names
            const toolMap = {
                'officepdf': 'officepdf',
                'pdfword': 'pdfword',
                'compress': 'compress',
                'imagepdf': 'imagepdf'
            };

            const toolName = toolMap[rawTool] || rawTool;
            const file = Array.isArray(files.file) ? files.file[0] : files.file;

            console.log("DIAGNOSTIC: Starting engine with tool ->", toolName);

            const task = instance.newTask(toolName);
            await task.start();
            await task.addFile(file.path);
            
            task.process(); 

            res.status(200).json({ 
                status: "SUCCESS", 
                server: task.server, 
                task: task.id 
            });

        } catch (e) {
            // This captures the exact reason for the crash
            console.error("ENGINE_CRASH_REASON:", e.message);
            res.status(500).json({ status: "ERROR", details: e.message });
        }
    });
};
