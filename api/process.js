/**
 * NADIM PDF - SECURE SERVER-SIDE BRIDGE
 * This file handles the entire iLovePDF workflow on the server
 * to bypass the current browser CORS bug identified by iLovePDF support.
 */

const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const multiparty = require('multiparty');

// Vercel config to allow binary file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Initialize with your Vercel Environment Variables
    const instance = new ILovePDFApi(
        process.env.ILOVEPDF_PUBLIC_KEY,
        process.env.ILOVEPDF_SECRET_KEY
    );

    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
        if (err || !files.file || !fields.tool) {
            return res.status(400).json({ error: 'Missing file or tool data' });
        }

        try {
            // 1. Extract tool name and file path from Multiparty arrays
            const toolName = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
            const file = Array.isArray(files.file) ? files.file[0] : files.file;

            // 2. Create the specific task
            const task = instance.newTask(toolName);

            // 3. START: Initialize the task on iLovePDF servers
            await task.start();

            // 4. UPLOAD: Handled server-to-server (No CORS issues)
            await task.addFile(file.path);

            // 5. PROCESS: Execute the document engineering
            // For 'pdfword', iLovePDF requires specific output params
            const params = toolName === 'pdfword' ? { pdfocr_convert_to: 'docx' } : {};
            await task.process(params);

            // 6. RESPONSE: Provide the download details to the frontend
            return res.status(200).json({
                status: 'SUCCESS',
                server: task.server,
                task: task.id
            });

        } catch (error) {
            console.error('ENGINE_ERROR:', error.message);
            return res.status(500).json({
                status: 'ERROR',
                message: error.message || 'The iLovePDF engine rejected the task.'
            });
        }
    });
}
