const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const instance = new ILovePDFApi(process.env.ILOVEPDF_PUBLIC_KEY, process.env.ILOVEPDF_SECRET_KEY);
    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
        // 1. Critical Check: Did the file actually land on Vercel?
        if (err || !files || !files.file || !files.file[0]) {
            return res.status(500).json({ status: "ERROR", details: "File transfer failed" });
        }

        try {
            // 2. Extract single strings from the Multiparty arrays
            const tool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            const file = files.file[0]; // Pick the first physical file

            // 3. Initialize and Start (Wait for iLovePDF to give us a server)
            const task = instance.newTask(tool);
            await task.start();

            // 4. Add File (Using the physical temporary path)
            await task.addFile(file.path);
            
            // 5. THE FIX: Wait 2 seconds for the file to "settle" on their server
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 6. Trigger process (No 'await' to beat Vercel's 10s limit)
            task.process(); 

            // 7. Success: Respond immediately
            res.status(200).json({ 
                status: "SUCCESS", 
                server: task.server, 
                task: task.id 
            });

        } catch (e) {
            // This will now print the REAL error message in your Vercel logs
            const realError = e.message || "Unknown Engine Rejection";
            console.error("ILOVEPDF_ENGINE_ERROR:", realError);
            res.status(500).json({ status: "ERROR", details: realError });
        }
    });
};
