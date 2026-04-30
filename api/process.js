const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const instance = new ILovePDFApi(process.env.ILOVEPDF_PUBLIC_KEY, process.env.ILOVEPDF_SECRET_KEY);
    const form = new multiparty.Form();

    form.parse(req, (err, fields, files) => {
        if (err || !files.file) return res.status(500).json({ status: "ERROR" });

        const tool = fields.tool[0];
        const file = files.file[0];
        
        // Official GitHub Logic Integration
        const task = instance.newTask(tool);

        task.start()
        .then(() => {
            return task.addFile(file.path);
        })
        .then(() => {
            // Standard process call
            return task.process();
        })
        .then(() => {
            // Success! Return data for frontend download
            res.status(200).json({ 
                status: "SUCCESS", 
                server: task.server, 
                task: task.id 
            });
        })
        .catch(error => {
            console.error("ENGINE_LOG:", error.message);
            res.status(500).json({ status: "ERROR", details: error.message });
        });
    });
};
