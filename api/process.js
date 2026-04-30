const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

// Required for Vercel to handle binary file streams
module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    // Initialize the official engine using your Environment Variables
    const instance = new ILovePDFApi(
        process.env.ILOVEPDF_PUBLIC_KEY, 
        process.env.ILOVEPDF_SECRET_KEY
    );

    const form = new multiparty.Form();
    
    form.parse(req, async (err, fields, files) => {
        // 1. CRITICAL CHECK: Did the file bytes actually arrive?
        if (err || !files.file || !fields.tool) {
            console.error("UPLOAD_FAILURE: File or Tool data missing from request.");
            return res.status(500).json({ status: "ERROR", details: "File transfer failed" });
        }

        try {
            // 2. EXTRACT: Correctly target the first item in the multiparty arrays
            const tool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            const file = Array.isArray(files.file) ? files.file[0] : files.file;

            console.log(`ENGINE_START: Tool=${tool} | Size=${file.size} bytes`);

            // 3. TASK INITIALIZATION (Auth & Start are handled automatically here)
            const task = instance.newTask(tool);
            
            // 4. EXECUTION CHAIN
            await task.start();
            await task.addFile(file.path);
            
            // 5. ASYNC PROCESS: We trigger the engine but don't 'await' the result.
            // This ensures the server finishes in 1 second, beating Vercel's 10s limit.
            task.process(); 

            // 6. RESPONSE: Send the server and task ID back to index.html
            res.status(200).json({ 
                status: "SUCCESS", 
                server: task.server, 
                task: task.id 
            });

        } catch (e) {
            // This will capture the specific API reason in your Vercel logs
            console.error("ILOVEPDF_ENGINE_ERROR:", e.message || "Unknown Engine Rejection");
            res.status(500).json({ status: "ERROR", details: e.message });
        }
    });
};
