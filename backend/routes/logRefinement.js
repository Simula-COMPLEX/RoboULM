/* 
  Route for logging refinement interactions.
  Stores user refinement data into an Excel file for study analysis.
*/

const express = require("express");
const router = express.Router();
const path = require("path");
const ExcelJS = require("exceljs");
const fs = require("fs");

// Defines the Excel schema and column order for refinement data
const REFINEMENT_COLUMNS = [
  { header: "CaseStudyName", key: "caseStudyName" },
  { header: "UserName", key: "userName" },
  { header: "Timestamp", key: "timestamp" },

  { header: "Prev Uncertainty", key: "prev_uncertainty" },
  { header: "Prev Nature", key: "prev_nature" },
  { header: "Prev Temporal Characteristics", key: "prev_temporal" },
  { header: "Prev Affect", key: "prev_affect" },
  { header: "Prev Occurrence", key: "prev_occurrence" },
  { header: "Prev Source of Adaptation", key: "prev_source" },
  { header: "Prev Scope", key: "prev_scope" },
  { header: "Prev Propagation", key: "prev_propagation" },
  { header: "Prev Resolution", key: "prev_resolution" },
  { header: "Prev Severity", key: "prev_severity" },
  { header: "Prev Data Characteristics", key: "prev_data" },
  { header: "Prev Ethical Implications", key: "prev_ethical" },

  { header: "Refinement Type", key: "refinement_type" },
  { header: "Ranking Scores", key: "ranking_scores" },
  { header: "Selected Taxonomy Rows", key: "taxonomy_rows" },
  { header: "Example Text", key: "example_text" },

  { header: "Uncertainty", key: "uncertainty" },
  { header: "Nature", key: "nature" },
  { header: "Temporal Characteristics", key: "temporal" },
  { header: "Affect", key: "affect" },
  { header: "Occurrence", key: "occurrence" },
  { header: "Source of Adaptation", key: "source" },
  { header: "Scope", key: "scope" },
  { header: "Propagation", key: "propagation" },
  { header: "Resolution", key: "resolution" },
  { header: "Severity", key: "severity" },
  { header: "Data Characteristics", key: "data" },
  { header: "Ethical Implications", key: "ethical" }
];

// Sanitizes and normalizes row data before inserting into Excel
function normalizeRow(data) {
  const row = {};

  REFINEMENT_COLUMNS.forEach(col => {
    let value = data[col.key];

    if (value === undefined || value === null) {
      // Handle undefined or null values by setting empty string
      row[col.key] = "";
    } else if (Array.isArray(value)) {
      // Join array values with separator for Excel cell
      row[col.key] = value.join(" | ");
    } else if (typeof value === "object") {
      // Serialize objects into JSON string
      row[col.key] = JSON.stringify(value);
    } else {
      // Convert primitives to string
      row[col.key] = String(value);
    }
  });

  return row;
}

// Endpoint to log refinement data; called from frontend when user submits refinement
router.post("/log-refinement", async (req, res) => {
  try {
    // Extract request body containing refinement data
    const rowData = req.body;
    const { caseStudyName, userName } = rowData;

    // Validate mandatory fields: caseStudyName and userName
    if (!caseStudyName || !userName) {
        return res.status(400).json({ error: "Missing caseStudyName or userName" });
    }   

    // Ensure StudyData folder exists or create it recursively
    const folderPath = path.join(__dirname, "../StudyData");
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Construct Excel file path based on caseStudyName and userName
    const filePath = path.join(
      folderPath,
      `${caseStudyName}_${userName}_RefinementData.xlsx`
    );

    const workbook = new ExcelJS.Workbook();

    // Load existing workbook if file exists, else create new workbook with sheet
    if (fs.existsSync(filePath)) {
      await workbook.xlsx.readFile(filePath);
    } else {
      // Ensure workbook has at least one worksheet when file does not exist
      workbook.addWorksheet("RefinementData");
    }

    // Retrieve existing worksheet or create it if missing
    let sheet = workbook.getWorksheet("RefinementData");

    if (!sheet) {
        sheet = workbook.addWorksheet("RefinementData");
    }

    // Assign columns schema to worksheet
    sheet.columns = REFINEMENT_COLUMNS;

    // Append normalized row data and write to Excel file
    sheet.addRow(normalizeRow(rowData));
    await workbook.xlsx.writeFile(filePath);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Refinement log error:", err);
    res.status(500).json({ error: "Failed to log refinement data" });
  }
});

// Export router for use in main app
module.exports = router;
