const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    const instance = new ILovePDFApi(process.env.ILOVEPDF_PUBLIC_KEY, process.env.ILOVEPDF_SECRET_KEY);
    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
        if (err || !files.file || !fields.tool) {
            return res.status(500).json({ status: "ERROR", details: "Payload incomplete" });
        }

        try {
            // 1. TOOL CLEANER: Maps your frontend names to official engine IDs
            const rawTool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            const toolMap = {
                'officepdf': 'officepdf',
                'pdfword': 'pdfword',
                'compress': 'compress',
                'imagepdf': 'imagepdf'
            };
            const toolName = toolMap[rawTool] || rawTool;

            // 2. EXTRACT FILE
            const file = Array.isArray(files.file) ? files.file[0] : files.file;

            console.log(`ENGINE_START: Tool=${toolName} | Size=${file.size} bytes`);

            // 3. OFFICIAL TASK CHAIN
            const task = instance.newTask(toolName);
            await task.start();
            await task.addFile(file.path);
            
            // 4. ASYNC PROCESS: Bypasses Vercel 10s limit
            task.process(); 

            // 5. SUCCESS RESPONSE
            res.status(200).json({ 
                status: "SUCCESS", 
                server: task.server, 
                task: task.id 
            });

        } catch (e) {
            console.error("ILOVEPDF_ENGINE_ERROR:", e.message || "Engine Rejection");
            res.status(500).json({ status: "ERROR", details: e.message });
        }
    });
};
