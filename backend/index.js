const express = require('express');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(express.json());

const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:3000', // Allow only your frontend
  methods: ['GET', 'POST'], // Specify allowed methods
  allowedHeaders: ['Content-Type']
}));

// Google Gemini configuration
const genAI = new GoogleGenerativeAI('YOUR_GEMINI_API_KEY');
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

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
 * @returns {Promise<string>} - The extracted text.
 */
async function performOcr(pdfBuffer) {
  const worker = await createWorker('eng');
  const { data: { text } } = await worker.recognize(pdfBuffer);
  await worker.terminate();
  return text;
}

/**
 * Generates interview questions based on the resume text using Google Gemini.
 * @param {string} resumeText - The text extracted from the resume.
 * @returns {Promise<string[]>} - An array of interview questions.
 */
async function generateInterviewQuestions(resumeText) {
  try {
    const prompt = `Generate 10 interview questions based on the following resume:\n\n${resumeText}`;
    const result = await model.generateContent(prompt);
    return result.response.text().split('\n').filter(q => q.trim() !== '');
  } catch (error) {
    console.error('Error generating interview questions:', error);
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

  try {
    const pdfBuffer = req.files.resume.data;

    // Step 1: Extract text from the PDF
    let resumeText = await extractTextFromPdf(pdfBuffer);

    // Step 2: If no text is found, perform OCR
    if (!resumeText || resumeText.trim() === '') {
      console.log('No text found in PDF. Using OCR...');
      resumeText = await performOcr(pdfBuffer);
    }

    // Step 3: Generate interview questions using Google Gemini
    const questions = await generateInterviewQuestions(resumeText);

    // Step 4: Return the questions
    res.json({ questions });
  } catch (error) {
    console.error('Error processing resume:', error);
    res.status(500).json({ error: error.message || 'Failed to process resume' });
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});