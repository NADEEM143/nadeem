const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    // 1. Initialize official engine
    const instance = new ILovePDFApi(process.env.ILOVEPDF_PUBLIC_KEY, process.env.ILOVEPDF_SECRET_KEY);
    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
        try {
            // 2. Extract tool name and file path
            const tool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            const file = Array.isArray(files.file) ? files.file[0] : files.file;

            // 3. Official Library Chain (Auth -> Start -> Upload -> Process)
            const task = instance.newTask(tool);
            await task.start();
            await task.addFile(file.path);
            
            // We trigger process but don't await to beat Vercel's 10s timeout
            task.process(); 

            // 4. Return success data to your index.html
            res.status(200).json({ 
                status: "SUCCESS", 
                server: task.server, 
                task: task.id 
            });
        } catch (e) {
            res.status(500).json({ status: "ERROR", details: e.message });
        }
    });
};
