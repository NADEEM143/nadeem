const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const instance = new ILovePDFApi(process.env.ILOVEPDF_PUBLIC_KEY, process.env.ILOVEPDF_SECRET_KEY);
    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
        // 1. Check if the file actually reached the server
        if (err || !files || !files.file || !files.file[0]) {
            console.error("LOG: File upload failed at the gateway.");
            return res.status(500).json({ status: "ERROR", details: "File not received" });
        }

        try {
            // 2. Extract single values from arrays
            const tool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            const file = files.file[0]; // The actual file object

            console.log("LOG: Initializing task for:", tool);

            // 3. Start Task
            const task = instance.newTask(tool);
            await task.start();

            // 4. Add File using the temporary path provided by multiparty
            await task.addFile(file.path);
            
            // 5. Trigger process but don't await (to beat Vercel's 10s timeout)
            task.process(); 

            // 6. Return success info immediately
            res.status(200).json({ 
                status: "SUCCESS", 
                server: task.server, 
                task: task.id 
            });

        } catch (e) {
            // This will capture the specific API error from iLovePDF
            console.error("ILOVEPDF_ENGINE_ERROR:", e.message);
            res.status(500).json({ status: "ERROR", details: e.message });
        }
    });
};
