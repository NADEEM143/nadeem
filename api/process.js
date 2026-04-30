const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const instance = new ILovePDFApi(process.env.ILOVEPDF_PUBLIC_KEY, process.env.ILOVEPDF_SECRET_KEY);
    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
        // 1. Critical Check: Did the file land?
        if (err || !files || !files.file) {
            return res.status(500).json({ status: "ERROR", details: "File transfer failed" });
        }

        try {
            // 2. Exact Extraction (Ensures we get a STRING, not an array or object)
            const tool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            const fileObj = Array.isArray(files.file) ? files.file[0] : files.file;
            const filePath = fileObj.path;

            if (!filePath) throw new Error("Internal file path is missing");

            // 3. Initialize and Start
            const task = instance.newTask(tool);
            await task.start();

            // 4. Add File using the physical path string
            await task.addFile(filePath);
            
            // 5. Trigger process but don't await (to beat Vercel's 10s limit)
            task.process(); 

            // 6. Success: Respond immediately
            res.status(200).json({ 
                status: "SUCCESS", 
                server: task.server, 
                task: task.id 
            });

        } catch (e) {
            const realError = e.message || "Engine rejected the file structure";
            console.error("ILOVEPDF_ENGINE_ERROR:", realError);
            res.status(500).json({ status: "ERROR", details: realError });
        }
    });
};
