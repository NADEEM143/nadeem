const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const instance = new ILovePDFApi(process.env.ILOVEPDF_PUBLIC_KEY, process.env.ILOVEPDF_SECRET_KEY);
    const form = new multiparty.Form();

    form.parse(req, (err, fields, files) => {
        try {
            if (err || !files.file || !fields.tool) {
                throw new Error("Missing file or tool selection");
            }

            // --- SAFETY MAP ---
            const rawTool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            
            // This ensures the official library gets the exact string it needs
            const toolMap = {
                'pdfword': 'pdfword',
                'officepdf': 'officepdf',
                'compress': 'compress',
                'imagepdf': 'imagepdf'
            };

            const toolName = toolMap[rawTool] || rawTool;
            const file = Array.isArray(files.file) ? files.file[0] : files.file;

            console.log("Starting tool:", toolName);

            const task = instance.newTask(toolName);

            task.start()
            .then(() => {
                return task.addFile(file.path);
            })
            .then(() => {
                return task.process();
            })
            .then(() => {
                res.status(200).json({ 
                    status: "SUCCESS", 
                    server: task.server, 
                    task: task.id 
                });
            })
            .catch(error => {
                console.error("ILOVEPDF_API_ERROR:", error.message);
                res.status(500).json({ status: "ERROR", details: error.message });
            });
        } catch (e) {
            console.error("SERVER_CRASH:", e.message);
            res.status(500).json({ status: "ERROR", details: e.message });
        }
    });
};
