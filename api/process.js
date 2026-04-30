const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const instance = new ILovePDFApi(process.env.ILOVEPDF_PUBLIC_KEY, process.env.ILOVEPDF_SECRET_KEY);
    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
        // SAFETY CHECK: Ensure files were actually uploaded
        if (err || !files || !files.file) {
            console.error("UPLOAD_ERROR:", err || "No file found in request");
            return res.status(500).json({ status: "ERROR", details: "File upload failed" });
        }

        try {
            // Extract single values from multiparty arrays
            const tool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            const file = Array.isArray(files.file) ? files.file[0] : files.file;

            // Start the official engine
            const task = instance.newTask(tool);
            await task.start();
            await task.addFile(file.path);
            
            // Process (Don't await to stay under Vercel's 10s limit)
            task.process(); 

            // Return success data
            res.status(200).json({ 
                status: "SUCCESS", 
                server: task.server, 
                task: task.id 
            });

        } catch (e) {
            console.error("ENGINE_CRASH:", e.message);
            res.status(500).json({ status: "ERROR", details: e.message });
        }
    });
};
