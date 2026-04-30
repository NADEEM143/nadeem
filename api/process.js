const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const instance = new ILovePDFApi(process.env.ILOVEPDF_PUBLIC_KEY, process.env.ILOVEPDF_SECRET_KEY);
    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
        // 1. Validate Upload
        if (err || !files || !files.file) {
            return res.status(500).json({ status: "ERROR", details: "File transfer failed" });
        }

        try {
            // 2. Extract Data
            const tool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            const file = Array.isArray(files.file) ? files.file[0] : files.file;

            console.log(`LOG: Engine starting for ${tool}. File size: ${file.size} bytes.`);

            // 3. Initialize Task
            const task = instance.newTask(tool);
            await task.start();

            // 4. Add File using the direct temporary path
            await task.addFile(file.path);
            
            // 5. Trigger process but don't await (to beat Vercel's 10s limit)
            task.process(); 

            // 6. Respond immediately with success
            res.status(200).json({ 
                status: "SUCCESS", 
                server: task.server, 
                task: task.id 
            });

        } catch (e) {
            console.error("ILOVEPDF_ENGINE_ERROR:", e.message || "Final Rejection");
            res.status(500).json({ status: "ERROR", details: e.message });
        }
    });
};
