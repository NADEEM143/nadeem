const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const instance = new ILovePDFApi(process.env.ILOVEPDF_PUBLIC_KEY, process.env.ILOVEPDF_SECRET_KEY);
    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
        try {
            if (err || !files.file || !fields.tool) throw new Error("Data missing");

            const toolName = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            const file = Array.isArray(files.file) ? files.file[0] : files.file;

            const task = instance.newTask(toolName);

            // 1. START & UPLOAD (This is fast)
            await task.start();
            await task.addFile(file.path);

            // 2. TRIGGER PROCESS BUT DON'T WAIT FOR IT TO FINISH
            // This prevents the 10-second timeout
            task.process(); 

            // 3. IMMEDIATELY SEND SUCCESS DATA
            // The browser will handle the "waiting" part
            res.status(200).json({ 
                status: "SUCCESS", 
                server: task.server, 
                task: task.id 
            });

        } catch (e) {
            console.error("SERVER_CRASH:", e.message);
            res.status(500).json({ status: "ERROR", details: e.message });
        }
    });
};
