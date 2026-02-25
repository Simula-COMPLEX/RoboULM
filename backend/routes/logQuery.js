/**
 * Route: Query Logging
 * -------------------
 * This router handles logging of user queries and corresponding LLM responses
 * into an Excel (.xlsx) file for study data collection.
 *
 * Each request appends a new row to a per-user, per-case-study workbook.
 * File naming convention:
 *   <CaseStudyName>_<UserName>_QueryData.xlsx
 *
 * Data is stored under the "QueryData" worksheet inside /StudyData.
 */
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");

// Utility function to parse structured uncertainty dimensions
// from raw LLM response text.
const extractDimensions = require("../utils/extractDimensions");


/**
 * POST /log-query
 * ---------------
 * Persists a single user query and extracted LLM dimensions to Excel.
 *
 * Expected request body:
 * - userName: string
 * - useCaseName: string
 * - timestamp: ISO string
 * - question: user query text
 * - llmResponse: raw LLM output containing labeled dimensions
 */
router.post("/log-query", (req, res) => {
  // Validate mandatory payload fields before processing
  try {
    const { userName, useCaseName, timestamp, question, llmResponse } = req.body;

    if (!userName || !useCaseName || !question || !llmResponse) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Parse uncertainty-related dimensions from the LLM response text
    const dimensions = extractDimensions(llmResponse);

    // Construct a single flat row object representing one query instance
    // This maps directly to one Excel row
    const row = {
      Timestamp: timestamp,
      Question: question,
      ...dimensions
    };

    // Sanitize user and case study names for safe filesystem usage
    const safeUser = userName.replace(/\s+/g, "_");
    const safeCase = useCaseName.replace(/\s+/g, "_");
    const fileName = `${safeCase}_${safeUser}_QueryData.xlsx`;
    const filePath = path.join(__dirname, "../StudyData", fileName);

    // Load existing workbook if present; otherwise create a new one
    let workbook;
    let worksheet;
    let data = [];

    if (fs.existsSync(filePath)) {
        // Load existing workbook & sheet
        workbook = XLSX.readFile(filePath);
        worksheet = workbook.Sheets["QueryData"];

        data = worksheet
            ? XLSX.utils.sheet_to_json(worksheet)
            : [];
        } else {
        // Create new workbook
        workbook = XLSX.utils.book_new();
        data = [];
        }

        // Append the new query record to in-memory dataset
        data.push(row);

        // Rebuild worksheet from full dataset to ensure consistent column ordering
        const newWorksheet = XLSX.utils.json_to_sheet(data);
        // const newWorksheet = XLSX.utils.json_to_sheet(data, { header: headers });

        // IMPORTANT: Replace or add sheet safely
        workbook.Sheets["QueryData"] = newWorksheet;

        if (!workbook.SheetNames.includes("QueryData")) {
            workbook.SheetNames.push("QueryData");
        }

    // Persist workbook back to disk (append-safe operation)
    XLSX.writeFile(workbook, filePath);

    res.json({ success: true });
  } catch (err) {
    console.error("Query log error:", err);
    res.status(500).json({ error: "Failed to log query data" });
  }
});

// Export router for registration in main server application
module.exports = router;