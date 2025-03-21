require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const { createClient } = require('@supabase/supabase-js');

const axios = require('axios');

const app = express();
app.use(express.json());
app.use(fileUpload()); // To handle file uploads

const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:3000', // Allow your frontend
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// ✅ Supabase configuration
const supabaseUrl = 'https://krqicljcoyxwkwdgfdpf.supabase.co';
const supabaseKey = process.env.SupabaseKey
const supabase = createClient(supabaseUrl, supabaseKey);

const HF_API_KEY = process.env.HF_API_KEY;
const MODEL_NAME = 'HuggingFaceH4/zephyr-7b-beta'; // Best for instruction tasks

const { v4: uuidv4 } = require('uuid'); // Import UUID to generate unique names

/**
 * Uploads a file to Supabase storage and returns the file URL.
 * @param {Buffer} fileBuffer - The file data as a buffer.
 * @param {string} fileName - Name of the file to be uploaded.
 * @returns {Promise<string>} - The URL of the uploaded file.
 */
async function uploadToSupabase(fileBuffer, fileName) {
  try {
    // ✅ Check if the file already exists
    const { data: existingFile, error: fetchError } = await supabase.storage
      .from('resumes')
      .list('uploads', { search: fileName });

    if (fetchError) {
      console.error('Error checking existing file:', fetchError.message);
      throw new Error('Failed to check existing file in Supabase');
    }

    let finalFileName = fileName;

    // ✅ If file already exists, generate a unique name
    if (existingFile && existingFile.length > 0) {
      const fileExt = fileName.split('.').pop(); // Get file extension
      const fileBaseName = fileName.replace(`.${fileExt}`, ''); // Get name without extension

      // Add a UUID or timestamp to avoid conflicts
      finalFileName = `${fileBaseName}_${uuidv4()}.${fileExt}`;
    }

    // ✅ Upload the file with the new name (if needed)
    const { data, error } = await supabase.storage
      .from('resumes') // 'resumes' is the bucket name
      .upload(`uploads/${finalFileName}`, fileBuffer, {
        contentType: 'application/pdf',
      });

    if (error) {
      console.error('Error uploading file to Supabase:', error.message);
      throw new Error('Failed to upload resume to Supabase');
    }

    // ✅ Get the public URL of the uploaded file
    const { publicURL } = supabase.storage.from('resumes').getPublicUrl(data.path);
    return publicURL;
  } catch (error) {
    console.error('Error uploading file to Supabase:', error.message);
    throw new Error('Failed to upload resume to Supabase');
  }
}


/**
 * Extracts text from a PDF file.
 * @param {Buffer} pdfBuffer - The PDF file as a buffer.
 * @returns {Promise<string>} - The extracted text.
 */
async function extractTextFromPdf(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Performs OCR on a PDF file.
 * @param {Buffer} pdfBuffer - The PDF file as a buffer.
 * @returns {Promise<string>} - The extracted text using OCR.
 */
async function performOcr(pdfBuffer) {
  const worker = await createWorker('eng'); // English language
  const { data: { text } } = await worker.recognize(pdfBuffer);
  await worker.terminate();
  return text;
}

async function generateInterviewQuestions(resumeText) {
  try {
    const prompt = `
Generate exactly 10 technical interview questions for the candidate based on the following resume details. 
Do not include any introductions, comments, or additional text. Only output the questions in a numbered format.

Resume:
${resumeText}
    `;

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${MODEL_NAME}`,
      {
        inputs: prompt,
        parameters: {
          max_length: 500, // To limit response size
          temperature: 0.7, // Maintain some variation
        },
      },
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    // ✅ Extract generated text from the response
    const generatedText = response.data[0]?.generated_text?.trim() || '';

    // ✅ Split and clean up questions
    const questions = generatedText
      .split('\n')
      .map((q) => q.trim())
      .filter((q) => q.match(/^\d+\./)); // Keep only numbered questions

    // ✅ Return only the cleaned questions
    if (questions.length === 0) {
      throw new Error('No valid questions generated. Try refining the prompt or resume details.');
    }

    return questions;
  } catch (error) {
    console.error(
      'Error generating interview questions:',
      error.response?.data || error.message
    );
    throw new Error('Failed to generate interview questions');
  }
}
// API Endpoint to handle resume and generate questions
app.post('/generate-questions', async (req, res) => {
  const { resumeText } = req.body;

  if (!resumeText) {
    return res.status(400).json({ error: 'Resume text is required' });
  }

  try {
    const questions = await generateInterviewQuestions(resumeText);
    res.json({ questions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to process a resume and generate interview questions.
 */
app.post('/process-resume', async (req, res) => {
  if (!req.files || !req.files.resume) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const pdfBuffer = req.files.resume.data;
    const fileName = req.files.resume.name;

    // ✅ Step 1: Upload file to Supabase and get the URL
    const fileUrl = await uploadToSupabase(pdfBuffer, fileName);

    // ✅ Step 2: Extract text from the PDF
    let resumeText = await extractTextFromPdf(pdfBuffer);

    // ✅ Step 3: If no text found, perform OCR
    if (!resumeText || resumeText.trim() === '') {
      console.log('No text found in PDF. Using OCR...');
      resumeText = await performOcr(pdfBuffer);
    }

    // ✅ Step 4: Generate interview questions using OpenAI GPT-3.5
    const questions = await generateInterviewQuestions(resumeText);

    // ✅ Step 5: Return the generated questions and file URL
    res.json({questions});
  } catch (error) {
    console.error('Error processing resume:', error);
    res.status(500).json({ error: error.message || 'Failed to process resume' });
  }
});

// ✅ Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
