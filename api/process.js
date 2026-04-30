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
            const tool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            const file = Array.isArray(files.file) ? files.file[0] : files.file;

            const task = instance.newTask(tool);
            
            // 1. Start Task
            await task.start();
            
            // 2. Upload File
            await task.addFile(file.path);
            
            // 3. THE CRITICAL FIX: FORCE WAIT
            // We wait 3 seconds to ensure iLovePDF's internal storage syncs the file.
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 4. Trigger Process (No 'await' to avoid Vercel's 10s timeout)
            task.process(); 

            // 5. Immediate Success Response
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
