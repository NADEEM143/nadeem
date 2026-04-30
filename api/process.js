const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

// Vercel config to allow file uploads
module.exports.config = {
    api: { bodyParser: false }
};

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    // Initialize the official library using your Environment Variables
    const instance = new ILovePDFApi(
        process.env.ILOVEPDF_PUBLIC_KEY, 
        process.env.ILOVEPDF_SECRET_KEY
    );

    const form = new multiparty.Form();
    
    form.parse(req, async (err, fields, files) => {
        if (err || !files.file || !files.file[0]) {
            return res.status(500).json({ status: "ERROR", details: "File missing" });
        }

        try {
            const tool = fields.tool[0]; // 'officepdf', 'pdfword', or 'compress'
            const file = files.file[0];

            // 1. Create a Task (The library handles Auth and Start automatically)
            // It uses 'officepdf' for Word and 'pdfword' for PDF-to-Word
            const task = instance.newTask(tool);

            // 2. Upload the file binary
            await task.addFile(file.path);

            // 3. Process the file (Deducts 1 credit)
            // The library waits for the server to be ready automatically
            await task.process();

            // 4. Return the server and task ID for the frontend download
            res.status(200).json({ 
                status: "SUCCESS", 
                server: task.server, 
                task: task.id 
            });

        } catch (error) {
            console.error("OFFICIAL_ENGINE_ERROR:", error.message);
            res.status(500).json({ 
                status: "ERROR", 
                details: error.message 
            });
        }
    });
};
