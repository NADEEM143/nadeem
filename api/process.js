const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    // This uses the logic from the GitHub you shared
    const instance = new ILovePDFApi(
        process.env.ILOVEPDF_PUBLIC_KEY, 
        process.env.ILOVEPDF_SECRET_KEY
    );

    const form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
        if (err || !files.file) return res.status(500).json({ error: "File missing" });

        try {
            const tool = fields.tool[0];
            const file = files.file[0];

            // Start Task
            const task = instance.newTask(tool);

            // Upload & Process (Library handles the timing and security)
            await task.addFile(file.path);
            await task.process();

            // Success! Send data back to frontend
            res.status(200).json({ 
                status: "SUCCESS", 
                server: task.server, 
                task: task.id 
            });
        } catch (e) {
            console.error("API_ERROR:", e.message);
            res.status(500).json({ error: e.message });
        }
    });
};
