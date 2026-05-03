const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

// Initialize the SDK with your environment variables
const instance = new ILovePDFApi(process.env.ILOVEPDF_PUBLIC_KEY, process.env.ILOVEPDF_SECRET_KEY);

module.exports = async (req, res) => {
    // 1. HANDLE CORS PREFLIGHT (Fixes the red 'X' in your test image)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 2. PARSE THE INCOMING FILE
    const form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
        if (err) return res.status(500).json({ status: "ERROR", details: "File Parse Failed" });

        const tool = fields.tool[0];
        const file = files.file[0];

        try {
            // 3. USE THE SDK (Option B from earlier)
            // This runs on the server, so it bypasses all browser CORS blocks
            const task = instance.newTask(tool);
            
            await task.addFile(file.path);
            await task.process();
            await task.download('./output.pdf'); // Or stream it back to the user

            // Return the success data back to your Elite Design
            res.status(200).json({
                status: "SUCCESS",
                server: task.server,
                task: task.taskId,
                token: task.token // Pass the session token back for the final download
            });

        } catch (e) {
            console.error(e);
            res.status(500).json({ status: "ERROR", details: e.message });
        }
    });
};
