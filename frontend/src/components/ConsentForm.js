// ConsentForm.js
// This component renders and manages the informed consent workflow,
// including participant input validation and exporting the consent as a PDF.

import React, { useState } from "react";
import "../styles/consent.css";
import jsPDF from "jspdf";

// ConsentForm component handles displaying consent information,
// collecting participant details, validating input, exporting signed consent PDF,
// and notifying parent component upon successful consent.
// Props:
// - onSuccess: callback to signal completion of consent process
function ConsentForm({ onSuccess }) {
  // State for participant information: name, date, location
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  // State for validation and action errors
  const [error, setError] = useState("");


  /**
   * Generates the consent PDF document:
   * - Adds consent text with pagination support
   * - Appends participant signature details at the bottom
   * - Converts PDF to Base64 string
   * - Sends Base64 PDF to backend for storage (no client download)
   */
  const exportConsentPDF = async () => {
    // Initialize jsPDF and layout parameters
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    let y = 10;

    doc.setFontSize(12);
    doc.text("Informed Consent to Participate in Evaluating \"LLM-based Uncertainty Identification Tool\"", margin, y);
    y += 10;

    // Extract consent text from DOM and split into lines for pagination
    const fullText = document.querySelector(".consent-text").innerText || "";
    const lines = doc.splitTextToSize(fullText, 180);

    // Render consent text lines with page breaks as needed
    lines.forEach((line) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 7;
    });

    // Render participant signature details at bottom of page or new page if needed
    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }

    y += 10;
    doc.text("Participant Signature:", margin, y);
    y += 8;
    doc.text(`Name: ${name}`, margin, y);
    y += 8;
    doc.text(`Date: ${date}`, margin, y);
    y += 8;
    doc.text(`Location: ${location}`, margin, y);

    // Sanitize participant name for safe filename
    const safeName = name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const filename = `${safeName}_signedconsent.pdf`;

    // Convert PDF to Base64 string for backend transmission
    const pdfArrayBuffer = doc.output("arraybuffer");
    const pdfBase64 = btoa(
      new Uint8Array(pdfArrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    // POST Base64 PDF and filename to backend API for saving
    await fetch("/api/save-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        filename, 
        pdfBase64 
      })
    });

  };

  /**
   * Handles user agreeing to consent:
   * - Validates required participant fields
   * - Saves consent details to localStorage
   * - Triggers PDF export and backend save
   * - Calls onSuccess callback to notify parent component
   */
  const handleAgree = async () => {
    if (!name.trim() || !date || !location.trim()) {
      setError("All fields are required.");
      return;
    }

    localStorage.setItem("consentGiven", "true");
    localStorage.setItem("participantName", name);
    localStorage.setItem("consentDate", date);
    localStorage.setItem("consentLocation", location);

    await exportConsentPDF();

    onSuccess(); // tell App consent is done
  };

  return (
    // Outer container for the consent form UI
    <div className="consent-container">
      <div className="consent-box">
        <h2>Informed Consent to Participate in Evaluating "LLM-based Uncertainty Identification Tool"</h2>

        {/* Consent text section displaying study details and participant information */}
        <div className="consent-text">

          <div>
            <h3>Purpose of the Study</h3>
            <p>The purpose of this study is to evaluate the effectiveness of the "LLM-based Uncertainty Identification Tool" in assisting users to:</p>
            <ul>
                <li>Create structured prompts for Large Language Models (LLMs).</li>
                <li>Generate uncertainty scenarios from LLM outputs.</li>
                <li>Improve LLM responses based on expert knowledge.</li>
            </ul>
            <p>This study aims to understand how the tool can help refine LLM outputs and identify uncertainties in various case studies.</p>
          </div>

          <div >
              <h3>What You Will Be Asked to Do</h3>
              <p>As a participant, your role will involve:</p>
              <ul>
                  <li>Providing the name of the case study you are working on and its publicly available requirement document.</li>
                  <li>Using the tool to iteratively: (1) Prompt and identify uncertainties with LLMs, (2) Refine LLM responses based on expert knowledge, and (3) Analyze applicablity and usefullness for a particular use case.
                  </li>
              </ul>
              <p><strong>Note:</strong> No personal data will be collected. The study will only record the prompts you generate, the corresponding LLM responses, and any refinements to analyze which prompts and feedback methods yield better results.</p>
          </div>

          <div >
              <h3>Potential Risks</h3>
              <p>There are minimal risks associated with participation in this study. The tasks primarily involve interacting with the tool and providing feedback. You are free to withdraw at any time.</p>
          </div>

          <div >
              <h3>Potential Benefits</h3>
              <p>While there are no direct personal benefits, your participation will contribute to:</p>
              <ul>
                  <li>Improving the usability and effectiveness of the tool.</li>
                  <li>Enhancing the ability of LLMs to handle uncertainty scenarios in professional contexts.</li>
              </ul>
          </div>

          <div>
            <h3>Confidentiality</h3>
            <p>
                <ul>
                  <li> No personal or sensitive data will be collected during the study.</li>
                  <li> Only the recorded prompts, LLM responses, and refinements will be analyzed.</li>
                  <li> All data will be anonymized and stored securely.</li>
                  <li> Results will be reported in aggregate form, ensuring that individual contributions cannot be identified.</li>
                </ul>
            </p>
          </div>

          <div>
              <h3>Voluntary Participation</h3>
              <p>
                  Participation in this study is entirely voluntary. You may decline to participate or withdraw at any time.
              </p>
          </div>

          <div>
            <h3>Consent Statement</h3>
            <p>
                I have read and understood the information provided above. I voluntarily agree to participate in this study. I understand that I can withdraw at any time. I also understand that my data will remain anonymous and will only be used for research purposes.
            </p>
          </div>
            
        </div>
        

        {/* Participant input form row for name, date, location */}
        <div className="consent-form">
          <div className="consent-form-row">
            <div className="consent-field">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="consent-field">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="consent-field">
              <label>Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            {/* Action buttons for agreeing or declining consent */}
            <button className="consent-btn primary" onClick={handleAgree}>I Agree</button>
            <button className="consent-btn decline" onClick={() => setError("You cannot proceed wihtout accepting.")}>Decline</button>
          </div>
        </div>

        {/* Error message display and locked state overlay if declined */}
        {error && <div className="consent-error-box">{error}</div>}
        {error === "You cannot proceed wihtout accepting." && <div className="consent-locked"></div>}
      </div>
    </div>
  );
}

// Export ConsentForm component for reuse as a gated entry step before application access
export default ConsentForm;