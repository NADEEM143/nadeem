const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

// Required for Vercel to handle binary file uploads
module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    // 1. Basic Method Check
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // 2. Initialize with your Vercel Environment Variables
    const instance = new ILovePDFApi(
        process.env.ILOVEPDF_PUBLIC_KEY,
        process.env.ILOVEPDF_SECRET_KEY
    );

    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
        // 3. Extract tool name and file path safely
        try {
            if (err || !files.file || !fields.tool) {
                throw new Error('Data missing from request');
            }

            const tool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            const file = Array.isArray(files.file) ? files.file[0] : files.file;

            // 4. Create and Start Task
            const task = instance.newTask(tool);
            await task.start();

            // 5. UPLOAD: Server-to-Server (Bypasses the iLovePDF CORS bug)
            await task.addFile(file.path);

            // 6. PROCESS: Trigger but don't await (to beat Vercel's 10s limit)
            task.process(); 

            // 7. SUCCESS: Return info to index.html immediately
            return res.status(200).json({
                status: 'SUCCESS',
                server: task.server,
                task: task.id
            });

        } catch (error) {
            console.error('ENGINE_LOG:', error.message);
            return res.status(500).json({ 
                status: 'ERROR', 
                message: error.message || 'The engine crashed.' 
            });
        }
    });
};
