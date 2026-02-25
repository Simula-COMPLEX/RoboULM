/**
 * Route for logging setup data related to user study cases.
 * Accepts setup details and appends them to an Excel file per user and use case.
 */

const express = require("express"); // Express framework for routing
const XLSX = require("xlsx"); // Library for reading/writing Excel files
const fs = require("fs-extra"); // File system utilities with extra features
const path = require("path"); // Path utilities for file system paths

const router = express.Router();

// Directory to store study data Excel files
const STUDY_DIR = path.join(__dirname, "..", "StudyData");
fs.ensureDirSync(STUDY_DIR);

/**
 * POST /log-setup
 * Called to log setup information for a user and use case.
 * Stores data in an Excel file named by use case and user.
 */
router.post("/log-setup", (req, res) => {
  try {
    // Extract expected fields from request body
    const {
      userName,
      useCaseName,
      timestamp,
      setupData
    } = req.body;

    // Generate safe filename components by replacing whitespace with underscores
    const safeCase = (useCaseName || "UnknownCase").trim().replace(/\s+/g, "_");
    const safeUser = (userName || "UnknownUser").trim().replace(/\s+/g, "_");
    const fileName = `${safeCase}_${safeUser}_SetupData.xlsx`;
    const filePath = path.join(STUDY_DIR, fileName);

    let workbook;
    let sheet;

    // Load existing workbook and sheet if file exists, else create new workbook and sheet
    if (fs.existsSync(filePath)) {
      workbook = XLSX.readFile(filePath);
      sheet = workbook.Sheets["SetupData"];
    } else {
      workbook = XLSX.utils.book_new();
      sheet = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(workbook, sheet, "SetupData");
    }

    // Read existing rows from the sheet as JSON
    const existingRows = XLSX.utils.sheet_to_json(sheet);

    // Construct a new row object from setupData and timestamp
    const row = {
      Timestamp: timestamp,
      Role: setupData.role || "",
      Objective: setupData.objective || "",
      Instructions: setupData.instructions || "",
      Restrictions: setupData.restrictions || "",
      Attachments: setupData.attachments.join(", ")
    };

    // Append new row to existing rows
    const updatedRows = [...existingRows, row];

    // Convert updated rows back to sheet and replace existing sheet in workbook
    const newSheet = XLSX.utils.json_to_sheet(updatedRows);
    workbook.Sheets["SetupData"] = newSheet;

    // Write updated workbook back to file
    XLSX.writeFile(workbook, filePath);

    // Respond with success status
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Setup logging failed:", err);
    res.status(500).json({ error: "Failed to log setup data" });
  }
});

module.exports = router;