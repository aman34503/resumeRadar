require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();

// ✅ Middleware
app.use(express.json({ limit: '10mb' }));
app.use(fileUpload({ limits: { fileSize: 10 * 1024 * 1024 } })); // 10MB limit

// ✅ CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-domain.com', // Replace with your custom domain
  'https://resume-radar-2mpc.vercel.app',
  'https://resume-radar-tau.vercel.app//process-resume/api',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);

// ✅ Supabase Configuration
const supabaseUrl = 'https://krqicljcoyxwkwdgfdpf.supabase.co';
const supabaseKey = process.env.SupabaseKey;
const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ HuggingFace API Configuration
const HF_API_KEY = process.env.HF_API_KEY;
const MODEL_NAME = 'mistralai/Mistral-7B-Instruct-v0.1';
const HF_API_URL = `https://api-inference.huggingface.co/models/${MODEL_NAME}`;

/**
 * Uploads a file to Supabase storage and returns the file URL.
 */
async function uploadToSupabase(fileBuffer, fileName) {
  try {
    const finalFileName = `${fileName.split('.')[0]}_${Date.now()}.${fileName.split('.').pop()}`;
    const { data, error } = await supabase.storage
      .from('resumes')
      .upload(`uploads/${finalFileName}`, fileBuffer, {
        contentType: 'application/pdf',
      });

    if (error) {
      console.error('Error uploading file to Supabase:', error.message);
      throw new Error('Failed to upload resume to Supabase');
    }
    const { publicURL } = supabase.storage.from('resumes').getPublicUrl(data.path);
    return publicURL;
  } catch (error) {
    console.error('Error uploading file to Supabase:', error.message);
    throw new Error('Failed to upload resume to Supabase');
  }
}

/**
 * Extracts text from a PDF file.
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
 * Performs OCR on a PDF file using Tesseract.js.
 */
async function performOcr(pdfBuffer) {
  const worker = await createWorker('eng');
  const { data: { text } } = await worker.recognize(pdfBuffer);
  await worker.terminate();
  return text;
}

/**
 * Generates interview questions based on resume text.
 */
async function generateInterviewQuestions(resumeText) {
  try {
    const MAX_RESUME_LENGTH = 5000;
    const trimmedResumeText =
      resumeText.length > MAX_RESUME_LENGTH
        ? resumeText.slice(0, MAX_RESUME_LENGTH)
        : resumeText;

    const prompt = `
Analyze the following resume and generate 10 relevant interview questions for a software developer.

Resume:
${trimmedResumeText}

List the questions in a numbered format.
`;
    const response = await axios.post(
      HF_API_URL,
      { inputs: prompt },
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('API Response:', response.data);

    if (!response.data || response.data.length === 0) {
      throw new Error(
        'No valid questions generated. Try refining the prompt or resume details.'
      );
    }

    const generatedText =
      response.data[0]?.generated_text?.trim() || 'No questions generated.';
    console.log('Generated Text:', generatedText);
 
    const questions = generatedText
      .split('\n')
      .map((q) => q.trim())
      .filter((q) => q.match(/^\d+\./))
      .slice(0, 10); // Only take the first 10 questions

    if (questions.length === 0) {
      throw new Error(
        'No valid questions generated. Try refining the prompt or resume details.'
      );
    }
    return questions;
  } 
  catch (error) {
    console.error(
      'Error generating interview questions:',
      error.response?.data || error.message
    );
    throw new Error('Failed to generate interview questions');
  }
}

/**
 * API endpoint to process a resume and generate interview questions.
 */
app.post('/process-resume', async (req, res) => {
  if (!req.files || !req.files.resume) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const timeout = setTimeout(() => {
    return res.status(408).json({ error: 'Request timed out' });
  }, 30000); // 30 seconds timeout

  try {
    const pdfBuffer = req.files.resume.data;

    let resumeText = await extractTextFromPdf(pdfBuffer);

    if (!resumeText || resumeText.trim() === '') {
      console.log('No text found in PDF. Using OCR...');
      resumeText = await performOcr(pdfBuffer);
    }
    const questions = await generateInterviewQuestions(resumeText);
    clearTimeout(timeout);
    res.json({ questions });
  } catch (error) {
    clearTimeout(timeout);
    res.status(500).json({ error: error.message || 'Failed to process resume' });
  }
});

// ✅ Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
