/**
 * FileParser.js
 * -------------
 * Express router responsible for parsing uploaded files and extracting raw text.
 *
 * Supported file types:
 * - PDF (via pdfjs-dist)
 * - DOCX (via mammoth)
 * - Plain text files
 *
 * This module is used by the backend to preprocess user-provided
 * requirement/specification documents before sending their contents to the LLM.
 */
const express = require("express");
// Multer is used to handle multipart/form-data file uploads (in-memory)
const multer = require("multer");
// Mammoth is used to extract raw text from DOCX files
const mammoth = require("mammoth"); 
// Dynamically import pdfjs to support ESM-only module in a CommonJS environment
let pdfjsLibPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then(mod => mod.default || mod);

// Create an isolated Express router for file parsing endpoints
const router = express.Router();
// Configure Multer to store uploaded files in memory (no disk writes)
const upload = multer(); // memory storage

/**
 * POST /parse-file
 * ----------------
 * Accepts a single uploaded file and returns extracted plain text.
 *
 * Request:
 * - multipart/form-data with field name "file"
 *
 * Response:
 * - { text: "<extracted text>" } on success
 * - error JSON on failure
 */
router.post("/parse-file", upload.single("file"), async (req, res) => {
  try {
    // Validate that a file was actually uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;

    // Handle PDF files using pdfjs to extract text page by page
    // --- PDF FILE ---
    if (file.mimetype === "application/pdf") {

      const uint8Array = new Uint8Array(file.buffer);
      const pdfjsLib = await pdfjsLibPromise;
      const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

      let fullText = "";

      // Iterate through all pages and concatenate extracted text
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        const strings = content.items.map(item => item.str).join(" ");
        fullText += strings + "\n\n";
      }

      return res.json({ text: fullText });
    }

    // Handle Microsoft Word (.docx) files using Mammoth
    // --- DOCX FILE ---
    if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const parsed = await mammoth.extractRawText({ buffer: file.buffer });
      return res.json({ text: parsed.value });
    }

    // Handle plain text files (e.g., .txt)
    // --- TEXT FILE ---
    if (file.mimetype.startsWith("text/")) {
      return res.json({ text: file.buffer.toString("utf8") });
    }

    // Reject unsupported file formats
    return res.status(400).json({ error: "Unsupported file type" });
  } catch (e) {
    // Log parsing errors for debugging and return a safe error response
    console.error("❌ File parse failed:", e);
    res.status(500).json({ error: "Parsing failed", details: e.message });
  }
});

// Export router to be mounted under /api in the main server
module.exports = router;