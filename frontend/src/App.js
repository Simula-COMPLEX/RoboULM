/**
 * App.js
 * --------
 * Main frontend entry point for RoboULM.
 *
 * Responsibilities:
 * - User onboarding, consent, and identification
 * - Prompt setup and workflow gating
 * - Chat session lifecycle and persistence
 * - LLM interaction (initial prompt, query, refinement)
 * - Refinement strategies: ranking, taxonomy, examples
 * - Logging of setup, queries, and refinements
 */

import { RESPONSE_FORMAT } from "./components/ResponseFormat";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import "./App.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import ConsentForm from "./components/ConsentForm";

/**
 * Root React component.
 * Holds all global state and handlers required for:
 * - UI workflow progression
 * - Prompt construction and validation
 * - Chat rendering and persistence
 * - Refinement logic and logging
 */
function App() {

  // Highlights uppercase keywords in user prompts for better readability in chat
  const highlightUserPrompt = (text) => {
    return text.replace(/\b([A-Z_]{3,})(?=\b|:)/g, '<span class="keyword-prompt">$1</span>');
  };
  // === Chat Sessions ===
  // Stores all chat sessions.
  // Persisted in localStorage to survive page reloads.
  const [chatSessions, setChatSessions] = useState(() => {
    const saved = localStorage.getItem("chatSessions");
    return saved ? JSON.parse(saved) : [[]];
  });
  const [currentSession, setCurrentSession] = useState(0);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // For rename modal
  const [renameIndex, setRenameIndex] = useState(null);
  const [renameValue, setRenameValue] = useState("");


  const [inputHeight, setInputHeight] = useState(120);
  const isResizingRef = useRef(false);

  const [showPromptPopup, setShowPromptPopup] = useState(false);
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false); 

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  const [showPromptCollapsed, setShowPromptCollapsed] = useState(false);
  
  // Tracks the current step shown in the workflow visualization
  const [workflowStep, setWorkflowStep] = useState("");
  // === Workflow Gating State ===
  // Controls which buttons/actions are enabled
  // INIT        → only Prompt Setup enabled
  // SETUP_DONE  → Send Prompt enabled
  // PROMPT_SENT → Send Correction enabled
  // REFINED     → all actions enabled
  const [workflowProgress, setWorkflowProgress] = useState("INIT");

  // === Prompt Setup Popup State ===
  // Controlled values edited inside the Prompt Setup modal
  const [popupRole, setPopupRole] = useState("");
  const [popupObjective, setPopupObjective] = useState("");
  const [popupInstructions, setPopupInstructions] = useState("");
  const [popupRestrictions, setPopupRestrictions] = useState("");
  const [popupAttachmentFiles, setPopupAttachmentFiles] = useState([]);

  // === Taxonomy Refinement State ===
  // Holds parsed taxonomy tables and user-selected rows
  const [taxonomySelection, setTaxonomySelection] = useState("");
  const [taxonomyData, setTaxonomyData] = useState({});
  const [selectedTableRows, setSelectedTableRows] = useState({ header: [], rows: [] });

  const [selectedRowIndices, setSelectedRowIndices] = useState([]);

  // === Example Suggestions ===
  // Displayed as selectable chips when corresponding textarea is empty
  const [showObjectiveExamples, setShowObjectiveExamples] = useState(true);
  const [showInstructionExamples, setShowInstructionExamples] = useState(true);
  const [showRestrictionExamples, setShowRestrictionExamples] = useState(true);
  const [refineMode, setRefineMode] = useState("ranking");

  const [userSetupDone, setUserSetupDone] = useState(() => localStorage.getItem("userSetupDone") === "true");
  const [userName, setUserName] = useState(() => localStorage.getItem("userName") || "");
  const [useCaseName, setUseCaseName] = useState(() => localStorage.getItem("useCaseName") || "");
  const [showUserEdit, setShowUserEdit] = useState(false);
  const [editUserErrors, setEditUserErrors] = useState({});

  const [showConsent, setShowConsent] = useState(true);

  const [consentGiven, setConsentGiven] = React.useState(false); 

  useEffect(() => {
    const savedConsent = localStorage.getItem("consentGiven");
    if (savedConsent === "true") {
      setConsentGiven(true);
    }
  }, []);


  const generateRandomUserName = () => {
    const randomNum = Math.floor(Math.random() * 9000 + 1000);
    return `User${randomNum}`;
  };

  // Popup field error state
  const [popupErrors, setPopupErrors] = useState({
    objective: false,
    attachments: false,
    instructions: false,
    restrictions: false
  });

  // Prompt Construction field refs
  const questionRef = useRef();
  const examplesRef = useRef();

  // Example suggestion text for popup editor
  const EXAMPLE_OBJECTIVES = [
    "The aim is to analyze uncertainty in robotics systems to improve adaptability and reliability."
  ];

  const EXAMPLE_INSTRUCTIONS = [
    "Step 1: Carefully read and comprehend the whole document attached, including figures and tables.",
    "Step 2: Use your knowledge of similar robotics and build a thorough understanding of the robotic system described in the document."
  ];

  const EXAMPLE_RESTRICTIONS = [
    "Make sure to stick to the robotic system described in the document.",
    "Do not confuse robotic faults/errors/failures with uncertainties.",
    "Avoid hallucinating system capabilities."
  ];

  // Required fields validation state and helper
  const [formErrors, setFormErrors] = useState({
    objective: false,
    question: false,
    attachments: false,
    instructions: false
  });

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();

    if (["png","jpg","jpeg","gif","svg"].includes(ext)) return "🖼️";
    if (["pdf"].includes(ext)) return "📄";
    if (["doc","docx"].includes(ext)) return "📝";
    if (["xls","xlsx"].includes(ext)) return "📊";
    if (["txt","md","rtf"].includes(ext)) return "📘";
    if (["zip","rar","7z"].includes(ext)) return "🗜️";
    return "📁";
  };
  
  // Handles file selection via file input
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setUploadedFiles(prev => [...prev, ...files]);  
    setPopupAttachmentFiles(prev => [...prev, ...files]);  
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setPopupAttachmentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  // Handles file selection via file input
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  // Validates mandatory fields before allowing prompt submission
  const validateRequiredFields = () => {
    const errors = {
      objective: !popupObjective.trim(),
      question: !questionRef.current?.value?.trim(),
      attachments: uploadedFiles.length === 0,
      instructions: !popupInstructions.trim()
    };

    setFormErrors(errors);

    return !Object.values(errors).some(Boolean);
  };

  // Keeps ranking slider labels in sync with slider values
  useEffect(() => {
    const sliders = document.querySelectorAll(".ranking-slider");

    sliders.forEach((slider) => {
      slider.addEventListener("input", (e) => {
        // numeric label next to slider
        e.target.nextSibling.textContent = e.target.value;
      });
    });

    return () => {
      sliders.forEach((slider) => {
        slider.removeEventListener("input", () => {});
      });
    };
  }, [refineMode]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return;
      const newHeight = Math.min(Math.max(window.innerHeight - e.clientY, 80), 500);
      setInputHeight(newHeight);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // const messages = chatSessions[currentSession] || [];
  const messages = Array.isArray(chatSessions[currentSession]) ? chatSessions[currentSession] : [];

  useEffect(() => {
    localStorage.setItem("chatSessions", JSON.stringify(chatSessions));
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatSessions]);
  
  useEffect(() => {
    try {
      const key = localStorage.getItem("chatSessions");
      if (key) {
        const parsed = JSON.parse(key);
        if (!Array.isArray(parsed)) {
          localStorage.setItem("chatSessions", JSON.stringify([[]]));
          setChatSessions([[]]);
        } else {
          // ensure each session is an array
          const normalized = parsed.map(s => (Array.isArray(s) ? s : []));
          setChatSessions(normalized);
        }
      }
    } catch (e) {
      localStorage.setItem("chatSessions", JSON.stringify([[]]));
      setChatSessions([[]]);
    }
  }, []);

  // Load popup values on start
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("popupPromptData") || "{}");
    if (saved.role) setPopupRole(saved.role);
    if (saved.objective) setPopupObjective(saved.objective);
    if (saved.instructions) setPopupInstructions(saved.instructions);
    if (saved.restrictions) setPopupRestrictions(saved.restrictions);
    if (saved.attachments) setPopupAttachmentFiles(saved.attachments);
  }, []);

  // Save popup values whenever user edits them
  useEffect(() => {
    localStorage.setItem(
      "popupPromptData",
      JSON.stringify({
        role: popupRole,
        objective: popupObjective,
        instructions: popupInstructions,
        restrictions: popupRestrictions,
        attachments: popupAttachmentFiles
      })
    );
  }, [
    popupRole,
    popupObjective,
    popupInstructions,
    popupRestrictions,
    popupAttachmentFiles
  ]); 

  // Loads and parses taxonomy tables from taxonomy.tex on app startup
  useEffect(() => {
    fetch(process.env.PUBLIC_URL + "/taxonomy.tex")
      .then(res => res.text())
      .then(tex => {
        const tables = tex.split("\\begin{table}");
        const parsed = {};

        tables.forEach(block => {
          if (!block.includes("\\caption")) return;

          const captionMatch = block.match(/\\caption\{([^}]+)\}/);
          if (!captionMatch) return;

          const caption = captionMatch[1].trim();

          const rows = block
            .split("\\hline")
            .map(r => r.trim())
            .filter(r => r.includes("&"))
            .map(r =>
              r
                .replace(/\\\\/g, "")
                .split("&")
                .map(col => col.replace(/\\textbf\{|}/g, "").trim())
            );

          const header = rows[0];
          const dataRows = rows.slice(1);

          parsed[caption] = { header, rows: dataRows };
        });

        setTaxonomyData(parsed);
      });
  }, []);


  const handleTaxonomyChange = (val) => {
    setTaxonomySelection(val);

    if (taxonomyData[val]) {
      setSelectedTableRows(taxonomyData[val]);
      setSelectedRowIndices([]);     // RESET selected rows
    } else {
      setSelectedTableRows({ header: [], rows: [] });
      setSelectedRowIndices([]);
    }
  };

  const toggleRowSelection = (index) => {
    setSelectedRowIndices((prev) => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      return [...prev, index];
    });
  };
  
  // Validates Prompt Setup popup fields before saving
  const validatePopupFields = () => {
    const errors = {
      objective: !popupObjective.trim(),
      attachments: popupAttachmentFiles.length === 0,
      instructions: !popupInstructions.trim(),
      restrictions: !popupRestrictions.trim()
    };

    setPopupErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  // --- Utility: Strip RESPONSE_FORMAT and anything after it for display ---
  const stripResponseFormatForDisplay = (text) => {
    if (!text) return "";

    const index = text.indexOf("RESPONSE FORMAT");
    if (index !== -1) {
      return text.substring(0, index).trim();
    }

    return text.trim();
  };

  // === INITIAL SETUP PROMPT ===
  /**
   * Sends the initial setup prompt to the LLM.
   *
   * Steps:
   * 1. Parse uploaded attachments via backend
   * 2. Build model prompt (full text)
   * 3. Build display prompt (file names only)
   * 4. Send prompt and initialize workflow
  */
  const sendInitialPrompt = async () => {
    const ROLE = popupRole || "";
    const OBJECTIVE = popupObjective || "";
    const INSTRUCTIONS = popupInstructions || "";
    const RESTRICTIONS = popupRestrictions || "";

    // 1. Parse files on backend
    const parsedFiles = [];
    for (const file of popupAttachmentFiles) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await axios.post("/api/parse-file", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        parsedFiles.push({ name: file.name, text: res.data?.text || "" });
      } catch (err) {
        console.error("PARSE ERROR for", file.name, err.response?.data || err);
        // push a short placeholder instead of failing whole flow
        parsedFiles.push({ name: file.name, text: `[PARSE_FAILED: ${file.name}]` });
      }
    }

    // 2. Build attachment text for MODEL (full parsed text)
    const ATTACHMENTS_FOR_MODEL = parsedFiles
      .map(f => `FILE: ${f.name}\nCONTENT:\n${f.text}\n`)
      .join("\n\n");

    // 3. Build attachment text for CHAT DISPLAY (names ONLY)
    const ATTACHMENTS_FOR_DISPLAY = parsedFiles
      .map(f => `${f.name}`)
      .join("\n");

    const promptForModel = `
You are a knowledgeable ${ROLE} focused on (i) understanding the overall context of the use case, (ii) answering questions and providing information about uncertainty in self-adaptive robotics, and (iii) learning from practitioners' feedback to improve responses iteratively.
In this prompt, focus only on below TASK for part (i) and deal with upcoming prompts to handle parts (ii) and (iii). 

TASK: Your task is to carefully understand the OBJECTIVE, read and comprehend the attached documents in ATTACHMENTS that provide system specifications/requirements, follow the step-by-step INSTRUCTIONS, and strictly consider RESTRICTIONS as follows.

OBJECTIVE: ${OBJECTIVE}

ATTACHMENTS: ${ATTACHMENTS_FOR_MODEL}

INSTRUCTIONS:
${INSTRUCTIONS}

RESTRICTIONS: ${RESTRICTIONS}
    `.trim();

    const promptForDisplay = `
You are a knowledgeable ${ROLE} focused on (i) understanding the overall context of the use case, (ii) answering questions and providing information about uncertainty in self-adaptive robotics, and (iii) learning from practitioners' feedback to improve responses iteratively.
In this prompt, focus only on below TASK for part (i) and deal with upcoming prompts to handle parts (ii) and (iii). 

TASK: Your task is to carefully understand the OBJECTIVE, read and comprehend the attached documents in ATTACHMENTS that provide system specifications/requirements, follow the step-by-step INSTRUCTIONS, and strictly consider RESTRICTIONS as follows.

OBJECTIVE: ${OBJECTIVE}

ATTACHMENTS: ${ATTACHMENTS_FOR_DISPLAY}

INSTRUCTIONS: ${INSTRUCTIONS}

RESTRICTIONS: ${RESTRICTIONS}
    `.trim();

    updateSession([...messages, { sender: "user", text: promptForDisplay }]);
    setLoading(true);


    try {
      const res = await axios.post("/chat", {
        prompt: promptForModel,
        model: "gemini-2.5-flash"
      });

      updateSession([...messages, { sender: "user", text: promptForDisplay }, { sender: "bot", text: res.data.reply }]);

      const botReply = res?.data?.reply || "Error: empty reply from server";
      setChatSessions(prev => {
        const updated = Array.isArray(prev) ? [...prev] : [[]];
        if (!Array.isArray(updated[currentSession])) updated[currentSession] = [];
        updated[currentSession] = [...updated[currentSession], { sender: "bot", text: botReply }];
        return updated;
      });

      setWorkflowStep("finalize");
    } catch (err) {
      updateSession([...messages, { sender: "user", text: promptForDisplay }, { sender: "bot", text: "Error: Could not get a response." }]);
      setChatSessions(prev => {
        const updated = Array.isArray(prev) ? [...prev] : [[]];
        if (!Array.isArray(updated[currentSession])) updated[currentSession] = [];
        updated[currentSession] = [...updated[currentSession], { sender: "bot", text: "Error: Could not get a response." }];
        return updated;
      });
    }

    setLoading(false);
  };

  const logSetupData = async () => {
    const storedUserName = localStorage.getItem("userName") || userName;
    const storedUseCaseName = localStorage.getItem("useCaseName") || useCaseName;
    const payload = {
      userName: storedUserName,
      useCaseName: storedUseCaseName,
      timestamp: new Date().toISOString(),
      setupData: {
        role: popupRole,
        objective: popupObjective,
        instructions: popupInstructions,
        restrictions: popupRestrictions,
        attachments: popupAttachmentFiles.map(f => f.name)
      }
    };

    // await axios.post("/api/log-setup", payload);
    await axios.post("/api/log-setup", payload);
  };
  
  // Build Response Ranking Prompt
  function buildRankingPrompt() {
    const dimensions = [
      "Uncertainty",
      "Nature",
      "Temporal Characteristics",
      "Affect",
      "Occurrence",
      "Source of Adaptation",
      "Scope",
      "Propagation",
      "Resolution",
      "Severity",
      "Data Characteristics",
      "Ethical Implications"
    ];

    const sliders = document.querySelectorAll(".ranking-slider");
    let rankingText = "";

    sliders.forEach((slider, i) => {
      const score = slider.value;
      rankingText += `${dimensions[i]}: ${score}\n`;
    });

  const fullPrompt = `
The previous response to the uncertainty question requires improvement. For each response dimension, domain experts have evaluated their agreements and provided a ranking in range 1 (lowest) to 10 (highest). A lowest rank score indicate level of experts disagreement and the need for totally revised response. A highest rank score means experts high agreement and the response does not need to be revised. A medium rank score means medium confidence and the response need to be revised partially. Considering the ranking scores given below, your task is to reanalyze and regenerate the response. Provide a structured and concise response in the specified format. Address each dimension explicitly and, where possible, include 1-3 sentences of reasoning for each dimension. Do not explain ranking scores.

<user__selection>RANKING SCORES</user__selection>
${rankingText}

${RESPONSE_FORMAT}
  `.trim();

    return {
      full: fullPrompt,
      display: stripResponseFormatForDisplay(fullPrompt)
    };
  }

  const buildTaxonomyPrompt = (selectedTableRows, selectedRowIndices) => {
    if (
      !selectedTableRows ||
      !selectedTableRows.rows ||
      !Array.isArray(selectedTableRows.rows) ||
      !Array.isArray(selectedRowIndices) ||
      selectedRowIndices.length === 0
    ) {
      return {
        full: "",
        display: ""
      };
    }

    const selectedRows = selectedRowIndices.map((idx) => selectedTableRows.rows[idx]);

    const rowsText = selectedRows
      .map((row) => row.join(" | "))
      .join("\n");


    const fullPrompt = `
The previous response to the uncertainty question requires improvement. Revise the response by incorporating additional uncertainties guided by the taxonomy provided below. Use the taxonomy strictly as an internal reference to identify missing or weakly addressed uncertainty dimensions. Do not define, describe, or explain any taxonomy terms or values. Do not restate or explain taxonomy headers or values.
Provide a structured and concise response in the specified format. Address each dimension explicitly and, where possible, include 1-3 sentences of reasoning for each dimension. Do not include generic definitions.

<user__selection>TAXONOMY SECTION</user__selection>
<user__selection>HEADER</user__selection> 
Uncertainty | Nature | Type | Stage | Temporal | Occurrence | SourceAdaptation | Scope | Risk | Affect | Propagation | Data Characteristics | Ethical Implications
<user__selection>VALUES</user__selection>
${rowsText}

${RESPONSE_FORMAT}
`.trim();

    return {
      full: fullPrompt,
      display: stripResponseFormatForDisplay(fullPrompt)
    };
  };

  const buildExamplePrompt = (exampleText) => {
    const fullPrompt = `
The previous response to the uncertainty question requires improvement. Use the following expert-provided example to regenerate the response. Provide a structured and concise response in the specified format. Address each dimension explicitly and, where possible, include 1-3 sentences of reasoning for each dimension.

EXAMPLES
${exampleText}

${RESPONSE_FORMAT}
  `.trim();

    return {
      full: fullPrompt,
      display: stripResponseFormatForDisplay(fullPrompt)
    };
  };

  function buildRefinementLogPayload({
    caseStudyName,
    userName,
    prevDimensions,
    refinementType,
    refinementData,
    newDimensions
  }) {
    return {
      caseStudyName,
      userName,
      timestamp: new Date().toISOString(),

      // Previous response
      prev_uncertainty: prevDimensions.UNCERTAINTY || "",
      prev_nature: prevDimensions.NATURE || "",
      prev_temporal: prevDimensions.TEMPORALCHARACTERISTICS || "",
      prev_affect: prevDimensions.AFFECT || "",
      prev_occurrence: prevDimensions.OCCURRENCE || "",
      prev_source: prevDimensions.SOURCEOFADAPTATION || "",
      prev_scope: prevDimensions.SCOPE || "",
      prev_propagation: prevDimensions.PROPAGATION || "",
      prev_resolution: prevDimensions.RESOLUTIONMECHANISM || "",
      prev_severity: prevDimensions.SEVERITY || "",
      prev_data: prevDimensions.DATACHARACTERISTICS || "",
      prev_ethical: prevDimensions.ETHICALIMPLICATIONS || "",

      // Refinement meta
      refinement_type: refinementType || "",
      ranking_scores: refinementData.rankingScores
        ? JSON.stringify(refinementData.rankingScores)
        : "",
      taxonomy_rows: refinementData.selectedRows
        ? refinementData.selectedRows.join(" || ")
        : "",
      example_text: refinementData.exampleText || "",

      // New response
      uncertainty: newDimensions.UNCERTAINTY || "",
      nature: newDimensions.NATURE || "",
      temporal: newDimensions.TEMPORALCHARACTERISTICS || "",
      affect: newDimensions.AFFECT || "",
      occurrence: newDimensions.OCCURRENCE || "",
      source: newDimensions.SOURCEOFADAPTATION || "",
      scope: newDimensions.SCOPE || "",
      propagation: newDimensions.PROPAGATION || "",
      resolution: newDimensions.RESOLUTIONMECHANISM || "",
      severity: newDimensions.SEVERITY || "",
      data: newDimensions.DATACHARACTERISTICS || "",
      ethical: newDimensions.ETHICALIMPLICATIONS || ""
    };
  }

  const DIMENSIONS = [
    "UNCERTAINTY",
    "NATURE",
    "TEMPORALCHARACTERISTICS",
    "AFFECT",
    "OCCURRENCE",
    "SOURCEOFADAPTATION",
    "SCOPE",
    "PROPAGATION",
    "RESOLUTIONMECHANISM",
    "SEVERITY",
    "DATACHARACTERISTICS",
    "ETHICALIMPLICATIONS"
  ];

  const RANKING_DIMENSION_HELP = {
    "Uncertainty": "The main uncertainty being identified in the robotic system.",
    "Nature": "How uncertainty behaves: deterministic/dtochastic, static/dynamic.",
    "Temporal Characteristics": "How the uncertainty changes over time, such as static, dynamic, or short-term or long-term.",
    "Affect": "What quality aspect (performance, safety, adaptability, or reliability) is impacted by this uncertainty?",
    "Occurrence": "Under what conditions (environmental, task, or interaction) this uncertainty is likely to appear.",
    "Source of Adaptation": "Which adaptive mechanism, trigger, or system source is related to this uncertainty.",
    "Scope": "Whether the uncertainty is local to one component or broader across the system.",
    "Propagation": "How the uncertainty may spread or impact other parts of the system, isolated (stays local) or cascading (affects other components).",
    "Resolution": "How the uncertainty can be handled, reduced, mitigated, or resolved.",
    "Severity": "How risky (low/high risk) this uncertainty is for system performance or safety.",
    "Data Characteristics": "The quality, completeness, reliability, or variability of related data.",
    "Ethical Implications": "Any considerations for trust, transparency, bias, and fairness, or ethical concerns involved."
  };

  // Extracts structured uncertainty dimensions from an LLM response
  // Used for comparison and logging during refinement
  function extractDimensionsFromResponse(text = "") {
    if (!text || typeof text !== "string") return {};

    const result = {};

    DIMENSIONS.forEach(dim => {
      const regex = new RegExp(
        `${dim}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*[A-Z]{3,}|$)`,
        "i"
      );

      const match = text.match(regex);

      result[dim] = match
        ? match[1]
            .replace(/-?\s*REASONING\s*:?[\\s\\S]*$/i, "")
            .replace(/\s+/g, " ")
            .replace(/^\s*\(+/, "")
            .replace(/\)+\s*$/, "")
            .trim()
        : "";
    });

    return result;
  }


  // === RESPONSE REFINEMENT ===
  /**
   * Handles response refinement.
   * Supported modes:
   * - Ranking-based refinement
   * - Taxonomy-guided refinement
   * - Example-driven refinement
   *
   * Also extracts dimensions and logs refinement metadata.
   */
  const sendRefinementPrompt = async () => {
    setWorkflowStep("refine");

    let finalPrompt = "";

    // --- STEP 1: previous bot message ---
    const sessionMessages = messages || [];
    const lastBotMsg = [...sessionMessages].reverse().find(m => m.sender === "bot");

    const prevBotResponse = lastBotMsg?.text || "";

    // Response Ranking active
    if (refineMode === "ranking") {
      finalPrompt = buildRankingPrompt();
    }

    // Taxonomy Guidance active
    else if (refineMode === "taxonomy") {
      finalPrompt = buildTaxonomyPrompt(selectedTableRows, selectedRowIndices);
    }

    // Example Driven active
    else if (refineMode === "examples") {
      finalPrompt = buildExamplePrompt(examplesRef.current.value || "");
    }

    // Fallback
    if (!finalPrompt) {
      updateSession([...messages, { sender: "bot", text: "No refinement data was provided." }]);
      return;
    }
    
    updateSession([...messages, { sender: "user", text: finalPrompt.display }]);
    setLoading(true);

    try {
      const res = await axios.post("/chat", {
        prompt: finalPrompt.full,
        model: "gemini-2.5-flash"
      });

      const reply = res.data.reply || "";
      updateSession([...messages, { sender: "user", text: finalPrompt.display }, { sender:"bot", text: reply }]);

      setWorkflowProgress("REFINED");   // ✅ ENABLE ALL buttons

      // --- STEP 3A: extract dimensions ---
      const prevDimensions = extractDimensionsFromResponse(prevBotResponse);
      const newDimensions = extractDimensionsFromResponse(reply);

      // --- STEP 3B: build refinement-specific metadata ---
      let refinementData = {};

      if (refineMode === "ranking") {
        refinementData.rankingScores = Array.from(
          document.querySelectorAll(".ranking-slider")
        ).map((s, i) => ({
          dimension: [
            "Uncertainty",
            "Nature",
            "Temporal Characteristics",
            "Affect",
            "Occurrence",
            "Source of Adaptation",
            "Scope",
            "Propagation",
            "Resolution",
            "Severity",
            "Data Characteristics",
            "Ethical Implications"
          ][i],
          score: s.value
        }));
      }

      if (refineMode === "taxonomy") {
        refinementData.selectedRows = selectedRowIndices.map(
          i => selectedTableRows.rows[i].join(" | ")
        );
      }

      if (refineMode === "examples") {
        refinementData.exampleText = examplesRef.current?.value || "";
      }

      // --- STEP 3C: build log payload ---
      const logPayload = buildRefinementLogPayload({
        caseStudyName: useCaseName,     
        userName,
        prevDimensions,
        refinementType: refineMode,     
        refinementData,
        newDimensions
      });

      // --- STEP 3D: fire-and-forget logging ---
      axios
        .post("/api/log-refinement", logPayload)
        .catch(err => console.error("Refinement log failed:", err));

    } catch (err) {
      updateSession([...messages, { sender: "user", text: finalPrompt.display }, { sender: "bot", text: "Error: Could not get a response." }]);
    }

    setLoading(false);
  };

  /**
   * Sends the main user question to the LLM.
   * Uses the previously defined objective, instructions, and restrictions.
   * Also logs the query and response.
   */
  const sendPrompt = async () => {
    if (!validateRequiredFields()) {
      return;
    }

    const QUESTION = questionRef.current?.value?.trim() || "";

    const constructedPrompt = `
Your task is to answer the QUESTION while taking OBJECTIVE, INSTRUCTIONS and RESTRICTIONS into consideration. Provide a structured and concise response in the specified format. Address each dimension explicitly and, where possible, include 1-3 sentences of reasoning for each dimension. Do not include generic definitions. Ensure all content is contextualized to the given robotic requirements. 
    
QUESTION: ${QUESTION}

${RESPONSE_FORMAT}
    `;

    // Remove the RESPONSE FORMAT and everything after for display
    const displayPrompt = constructedPrompt.replace(/RESPONSE FORMAT[\s\S]*$/i, "").trim();

    const userMessage = { sender: "user", text: displayPrompt };
    updateSession([...messages, userMessage]);

    setLoading(true);

    try {
      const res = await axios.post("/chat", { 
        prompt: constructedPrompt,
        model: "gemini-2.5-flash"
      });
      
      const reply = res.data.reply || "";
      setWorkflowStep("analyze");
      updateSession([...messages, userMessage, { sender: "bot", text: reply }]);

      setWorkflowProgress("PROMPT_SENT");   // ✅ ENABLE Send Correction

      // LOG QUERY DATA
      await logQueryData(QUESTION, reply);
      
    } catch (err) {
      updateSession([...messages, userMessage, { sender: "bot", text: "Error: Could not get a response." }]);
    }
    setLoading(false);
  };

  const logQueryData = async (question, llmResponse) => {
    const payload = {
      userName: localStorage.getItem("userName"),
      useCaseName: localStorage.getItem("useCaseName"),
      timestamp: new Date().toISOString(),
      question,
      llmResponse
    };

    try {
      await axios.post("/api/log-query", payload);
    } catch (err) {
      console.error("Failed to log query data", err);
    }
  };

  // Safely updates the current chat session while preserving session structure
  const updateSession = (newMessagesOrUpdater) => {
    setChatSessions((prev) => {
      const updated = Array.isArray(prev) ? [...prev] : [[]];

      // ensure the current slot exists and is an array
      if (!Array.isArray(updated[currentSession])) {
        for (let i = 0; i <= currentSession; i++) {
          if (!Array.isArray(updated[i])) updated[i] = [];
        }
      }

      let newSessionMessages;

      // If caller passed a function, call it with current session messages
      if (typeof newMessagesOrUpdater === "function") {
        newSessionMessages = newMessagesOrUpdater(updated[currentSession]);
      } else {
        newSessionMessages = newMessagesOrUpdater;
      }

      updated[currentSession] = Array.isArray(newSessionMessages) ? newSessionMessages : [];
      return updated;
    });
  };
  
  // === UI Rendering ===
  // Renders sidebar, workflow visualization, prompt panels,
  // refinement panels, modals, and the main chat window
  if (!consentGiven) {
    return (
      <ConsentForm
        onSuccess={() => {
          setConsentGiven(true);
          setShowConsent(false);
        }}
      />
    );
  }
  if (!userSetupDone) {
    return (
      <div className="user-setup-overlay">
        <div className="user-setup-modal">
          <h2>Welcome!</h2>
          <p>Please enter your basic details to begin.</p>

          <div className="setup-field">
            <label>User Name</label>
            <input
              type="text"
              value={userName || generateRandomUserName()}
              onChange={(e) => setUserName(e.target.value)}
            />
          </div>

          <div className="setup-field">
            <label>Use Case Name</label>
            <input
              type="text"
              value={useCaseName}
              onChange={(e) => setUseCaseName(e.target.value)}
            />
          </div>

          <button
            className="setup-btn"
            onClick={() => {
              if (!userName.trim() || !useCaseName.trim()) {
                alert("Please fill all fields.");
                return;
              }

              localStorage.setItem("userSetupDone", "true");
              localStorage.setItem("userName", userName.trim());
              localStorage.setItem("useCaseName", useCaseName.trim());

              // Create session key unique per user + usecase
              const sessionKey = `${userName.trim()}_${useCaseName.trim()}_sessions`;
              // after localStorage.setItem(sessionKey, JSON.stringify([[]])) if needed
              let stored = JSON.parse(localStorage.getItem(sessionKey) || "null");
              if (!Array.isArray(stored)) {
                stored = [[]];
                localStorage.setItem(sessionKey, JSON.stringify(stored));
              }
              setChatSessions(stored);
              setCurrentSession(0); // ensure index is 0
              setUserSetupDone(true); 
            }}
          >
            Continue
          </button>
        </div>
      </div>
    )}
  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="user-info-row">
          {/* User edit box (left) */}
          <div
            className="user-info-box"
            onClick={() => setShowUserEdit(true)}
            title="Edit user info"
          >
            <span className="user-info-item">👤 {userName}</span>
            <span className="user-info-item">📂 {useCaseName}</span>
          </div>

          {/* Tool Name (center) */}
          <div className="tool-name-box">
            <span className="tool-name-text">RoboULM</span>
          </div>

          {/* Link for Feedback */}
          <button
            className="feedback-btn"
            disabled={workflowProgress !== "REFINED"}
            title="Send Feedback"
            onClick={() => window.open("", "_blank")}
          >
            💬 <span className="feedback-text">Feedback</span>
          </button>

        </div>
        {/* POPUP STATE */}
        {showPromptPopup && (
          <div className="modal-overlay">
            <div className="modal-large">
              <h2 className="modal-title">Prompt Setup</h2>
              <div className="modal-form">
              <div className="form-row">
                <label>Role</label>
                <select
                  className="input-select"
                  value={popupRole}
                  onChange={(e) => setPopupRole(e.target.value)}
                >
                  {/* <option>Analyst</option> */}
                  <option>Assistant</option>
                  <option>Expert</option>
                  {/* <option>Robotic Engineer</option> */}
                </select>
              </div>
              <div className={`form-row ${popupErrors.objective ? "error" : ""}`}>
                <label>Objective</label>
                <div className="textarea-wrapper">
                  <textarea
                    className="input-textarea-objective"
                    value={popupObjective}
                    onChange={(e) => {
                      setPopupObjective(e.target.value);
                      if (e.target.value.trim() !== "") setShowObjectiveExamples(false);
                    }}
                    onFocus={() => {
                      if (popupObjective.trim() === "") setShowObjectiveExamples(true);
                    }}
                  />

                  {showObjectiveExamples && popupObjective.trim() === "" && (
                    <div className="textarea-overlay-examples">
                      {EXAMPLE_OBJECTIVES.map((ex, i) => (
                        <div
                          key={i}
                          className="example-chip"
                          onClick={() => {
                            setPopupObjective(ex);
                            setShowObjectiveExamples(false);
                          }}
                        >
                          {ex}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={`form-row ${popupErrors.attachments ? "error" : ""}`}>
                <label>Attachments</label>
                <div
                  className={`file-upload-area ${dragActive ? "drag-over" : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="file-upload-header">
                    <span className="file-upload-icon">📁</span>
                    <span>Drag & drop files here, or click below:</span>
                  </div>

                  <div className="custom-file-wrapper">
                    <button className="custom-file-btn">Choose File</button>
                    <span className="custom-file-label">
                      {uploadedFiles.length === 0 ? "No files chosen" : `${uploadedFiles.length} file(s) selected`}
                    </span>

                    <input
                      type="file"
                      onChange={handleFileSelect}
                      multiple
                    />
                  </div>

                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="upload-file-row">
                      <span className="file-type-icon">{getFileIcon(file.name)}</span>
                      <span className="upload-file-name">{file.name}</span>

                      <button
                        className="remove-upload-btn"
                        onClick={() => removeFile(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`form-row ${popupErrors.instructions ? "error" : ""}`}>
                <label>Instructions</label>
                <div className="textarea-wrapper">
                  <textarea
                    className="input-textarea"
                    value={popupInstructions}
                    onChange={(e) => {
                      setPopupInstructions(e.target.value);
                      if (e.target.value.trim() !== "") setShowInstructionExamples(false);
                    }}
                    onFocus={() => {
                      if (popupInstructions.trim() === "") setShowInstructionExamples(true);
                    }}
                  />

                  {showInstructionExamples && popupInstructions.trim() === "" && (
                    <div className="textarea-overlay-examples">
                      {EXAMPLE_INSTRUCTIONS.map((ex, i) => (
                        <div
                          key={i}
                          className="example-chip"
                          onClick={() => {
                            setPopupInstructions(ex);
                            setShowInstructionExamples(false);
                          }}
                        >
                          {ex}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={`form-row ${popupErrors.restrictions ? "error" : ""}`}>
                <label>Restrictions</label>
                <div className="textarea-wrapper">
                  <textarea
                    className="input-textarea"
                    value={popupRestrictions}
                    onChange={(e) => {
                      setPopupRestrictions(e.target.value);
                      if (e.target.value.trim() !== "") setShowRestrictionExamples(false);
                    }}
                    onFocus={() => {
                      if (popupRestrictions.trim() === "") setShowRestrictionExamples(true);
                    }}
                  />

                  {showRestrictionExamples && popupRestrictions.trim() === "" && (
                    <div className="textarea-overlay-examples">
                      {EXAMPLE_RESTRICTIONS.map((ex, i) => (
                        <div
                          key={i}
                          className="example-chip"
                          onClick={() => {
                            setPopupRestrictions(ex);
                            setShowRestrictionExamples(false);
                          }}
                        >
                          {ex}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="popup-save-btn"
                  onClick={async () => {
                    if (!validatePopupFields()) return;
                    setShowPromptPopup(false);
                    await logSetupData();
                    setWorkflowProgress("SETUP_DONE");   // ✅ ENABLE Send Prompt
                    sendInitialPrompt();
                  }}
                >
                  Save & Close
                </button>

                <button
                  className="popup-cancel-btn"
                  onClick={() => setShowPromptPopup(false)}
                >
                  Cancel
                </button>
              </div>

            </div>
            </div>
          </div>
        )}

        {showAnalysisPopup && (
          <div className="modal-overlay">
            <div className="modal-large">
              <h2 className="modal-title">Edit Response Analysis</h2>
              <textarea className="modal-textarea">{/* bind later */}</textarea>
              <button onClick={() => setShowAnalysisPopup(false)}>Close</button>
            </div>
          </div>
        )}

        {/* WORKFLOW CARD */}
        <div className="workflow-card">

          <div className="workflow-step">
            <span className="circle filled"></span>
            <span className="workflow-label">Start</span>
          </div>

          <span className="arrow">→</span>

          <button className={`workflow-btn ${workflowStep === "setup" ? "active" : ""}`}
            onClick={() => setWorkflowStep("setup")}
          >
            Prompt Setup
          </button>

          <span className="arrow">→</span>

          {/* --- Two-way flow group: Finalize <-> Send <-> Analyze <-> Refine --- */}
          <div className="two-way-group">
            <button className={`workflow-btn ${workflowStep === "finalize" ? "active" : ""}`} onClick={() => setWorkflowStep("finalize")}>
              Initial Query
            </button>

            <span className="two-way-arrow">↔</span>

            <button className={`workflow-btn ${workflowStep === "send" ? "active" : ""}`} onClick={() => setWorkflowStep("send")}>
              Send Query
            </button>

            <span className="two-way-arrow">↔</span>

            <button className={`workflow-btn ${workflowStep === "analyze" ? "active" : ""}`} onClick={() => setWorkflowStep("analyze")}>
              Analyze Response
            </button>

            <span className="two-way-arrow">↔</span>

            <button className={`workflow-btn ${workflowStep === "refine" ? "active" : ""}`} onClick={() => setWorkflowStep("refine")}>
              Refine Response
            </button>
          </div>

          <span className="arrow">→</span>

          <div className="workflow-step">
            <span className="circle"></span>
            <span className="workflow-label">End</span>
          </div>

        </div>

        {/* CONTEXT UNDERSTANDING */}
        <div className="panel-header">
          <h2 className="panel-title">1. Context Understanding</h2>
          <div className="button-row">
            <button
              className="popup-btn"
              disabled={false}   // always enabled
              onClick={() => {
                setWorkflowStep("setup");
                setPopupRole(popupRole || "Assistant");
                setPopupObjective(popupObjective || "");
                setPopupInstructions(popupInstructions || "");
                setPopupRestrictions(popupRestrictions || "");
                setPopupAttachmentFiles(uploadedFiles || []);
                setShowPromptPopup(true);
              }}
            >
              ✏️ Prompt Setup
            </button>
          </div>
        </div>

        {/* PROMPT CONSTRUCTION */}
        <div className="panel-header">
          <h2 className="panel-title">2. Initial Query</h2>
          <div className="button-row">
            <button
              className="popup-btn"
              disabled={workflowProgress === "INIT"}
              onClick={() => {
                setWorkflowStep("send");
                sendPrompt();
              }}
            >
              🚀 Send Query
            </button>
          </div>
        </div>

        <div className={`panel-card prompt-panel-card ${showPromptCollapsed ? "collapsed" : ""}`}>

          <div className={`form-row ${formErrors.question ? "error" : ""}`}>
            <label>Uncertainty-related Question</label>
            <textarea
              className="input-textarea"
              ref={questionRef}
              onInput={() => setWorkflowStep("finalize")}
            ></textarea>
          </div>

        </div>

        {/* REFINEMENT SECTION */}
        <div className="panel-header">
          <h2 className="panel-title">3. Iterative Response Refinement</h2>
          <div className="button-row">
            {/* <button className="popup-btn" onClick={() => {
              setWorkflowStep("refine");
              sendRefinementPrompt();
            }}>
              📤 Send Correction
            </button> */}
            <button
              className="popup-btn"
              disabled={workflowProgress !== "PROMPT_SENT" && workflowProgress !== "REFINED"}
              onClick={() => {
                setWorkflowStep("refine");
                sendRefinementPrompt();
              }}
            >
              📤 Send Refinement
            </button>
          </div>
        </div>

        <div className="refine-toggle-row">
          
          <button
            className={`refine-toggle-btn ${refineMode === "ranking" ? "active" : ""}`}
            onClick={() => setRefineMode("ranking")}
          >
            Response Ranking
          </button>

          <button
            className={`refine-toggle-btn ${refineMode === "taxonomy" ? "active" : ""}`}
            onClick={() => setRefineMode("taxonomy")}
          >
            Taxonomy Guidance
          </button>

          <button
            className={`refine-toggle-btn ${refineMode === "examples" ? "active" : ""}`}
            onClick={() => setRefineMode("examples")}
          >
            Example Driven
          </button>

          
        </div>

        <div className="panel-card refinement-section">

          {refineMode === "examples" && (
            <div className="form-row">
              <label>Examples</label>
              <textarea className="input-textarea" ref={examplesRef}></textarea>
            </div>
          )}

          {refineMode === "taxonomy" && (
            <div className="taxonomy-wrapper">
              <div className="form-row">
                <label>Taxonomy Reference</label>
                <select
                  className="input-select"
                  value={taxonomySelection}
                  onChange={(e) => handleTaxonomyChange(e.target.value)}
                >
                  <option value="">None</option>
                  {Object.keys(taxonomyData).map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRowIndices.length > 0 && (
                <div className="selected-rows-box">
                  <h4>Selected Rows:</h4>
                  {selectedRowIndices.map((idx) => (
                    <div key={idx} className="selected-row-item">
                      {selectedTableRows.rows[idx].join(" | ")}
                    </div>
                  ))}
                </div>
              )}

              {taxonomySelection && selectedTableRows.header.length > 0 && (
                <div className="taxonomy-table-container">
                  <table className="taxonomy-table">
                    <thead>
                      <tr>
                        {selectedTableRows.header.map((h, i) => (
                          <th key={i}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTableRows.rows.map((row, rIndex) => (
                        <tr
                          key={rIndex}
                          className={selectedRowIndices.includes(rIndex) ? "taxonomy-selected" : ""}
                          onClick={() => toggleRowSelection(rIndex)}
                        >
                          {row.map((col, cIndex) => (
                            <td key={cIndex}>{col}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
            </div>
          )}

          {refineMode === "ranking" && (
            <div className="ranking-container">
              {[
                "Uncertainty",
                "Nature",
                "Temporal Characteristics",
                "Affect",
                "Occurrence",
                "Source of Adaptation",
                "Scope",
                "Propagation",
                "Resolution",
                "Severity",
                "Data Characteristics",
                "Ethical Implications"
              ].map((dim) => (
                <div className="ranking-row" key={dim}>
                  <label className="ranking-label">
                    <span>{dim}</span>
                    <span
                      className="dimension-help-icon"
                      tabIndex="0"
                      role="button"
                      aria-label={`Help for ${dim}`}
                    >
                      ?
                      <span className="dimension-tooltip">
                        {RANKING_DIMENSION_HELP[dim]}
                      </span>
                    </span>
                  </label>

                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    defaultValue="5"
                    className="ranking-slider"
                  />

                  <span className="ranking-value">5</span>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

      {/* Main Chat Area */}
      <div className="app-container">
        <div className="chat-window">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.sender}`}>
              <div>
                {msg.sender === "bot" ? (() => {
                  // Highlight uppercase keywords (3+ chars, including _)
                  const cleanedText = msg.text
                    .replace(/[()[\]{}]/g, "")
                    .replace(/\n{3,}/g, "\n\n")        // collapse 3+ newlines into 2
                    .replace(/\n\s+\n/g, "\n\n")       // remove whitespace-only lines
                    .replace(/^\s+$/gm, "");           // remove fully empty lines
                  // Remove empty <p></p>, <p><br/></p>, <p> </p>, etc.
                  const cleanedHtml = cleanedText
                    .replace(/<p>\s*<\/p>/g, "")        // empty paragraphs
                    .replace(/<p><br\s*\/?><\/p>/g, "") // paragraphs with only <br>
                    .replace(/(<br\s*\/?>\s*){2,}/g, "<br/>"); // collapse multiple <br>
                  const highlightedText = cleanedHtml.replace(/\b([A-Z_]{3,})\b/g, '<span class="keyword">$1</span>');
                  return (
                    <ReactMarkdown
                      components={{
                        p({ node, children, ...props }) {
                          const text = String(children).trim();

                          // Skip empty paragraphs generated by extra newlines
                          if (!text || text === "<br>" || text === "<br/>") {
                            return null;
                          }

                          return <p {...props}>{children}</p>;
                        },
                        code({ node, inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "");
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={materialDark}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            >
                              {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                      rehypePlugins={[rehypeRaw]}
                    >
                      {highlightedText}
                    </ReactMarkdown>
                  );
                })() : (
                  <span dangerouslySetInnerHTML={{ __html: highlightUserPrompt(msg.text) }} />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
          {/* {loading && <div className="loading-text">{modelDisplayNames[model] || model} is responding...</div>} */}
          {loading && <div className="loading-text">LLM is responding...</div>}
        </div>

        {/* Bottom input UI removed */}
      </div>

      {/* Rename Modal */}
      {renameIndex !== null && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Rename Chat</h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button
                onClick={() => {
                  setChatSessions(prev => {
                    const updated = [...prev];
                    updated[renameIndex] = Object.assign([], updated[renameIndex], { name: renameValue });
                    return updated;
                  });
                  setRenameIndex(null);
                }}
              >
                Save
              </button>
              <button onClick={() => setRenameIndex(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showUserEdit && (
      <div className="modal-overlay">
        <div className="modal">
          <h3>Edit User Info</h3>

          <label className={editUserErrors.user ? "error-label" : ""}>User Name</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => {
              setUserName(e.target.value);
              if (editUserErrors.user) setEditUserErrors(prev => ({ ...prev, user: false }));
            }}
            className={editUserErrors.user ? "error-input" : ""}
            autoFocus
          />
          {editUserErrors.user && <div className="error-msg">User name is required.</div>}

          <label className={editUserErrors.usecase ? "error-label" : ""}>Use Case Name</label>
          <input
            type="text"
            value={useCaseName}
            onChange={(e) => {
              setUseCaseName(e.target.value);
              if (editUserErrors.usecase) setEditUserErrors(prev => ({ ...prev, usecase: false }));
            }}
            className={editUserErrors.usecase ? "error-input" : ""}
          />
          {editUserErrors.usecase && <div className="error-msg">Use case name is required.</div>}

          <div className="modal-actions">
            <button
              onClick={() => {
                // Validation
                const userMissing = !userName || userName.trim() === "";
                const caseMissing = !useCaseName || useCaseName.trim() === "";
                if (userMissing || caseMissing) {
                  setEditUserErrors({
                    user: userMissing,
                    usecase: caseMissing
                  });
                  return;
                }

                // Save only when valid
                localStorage.setItem("userName", userName.trim());
                localStorage.setItem("useCaseName", useCaseName.trim());
                setShowUserEdit(false);
              }}
            >
              Save
            </button>

            <button onClick={() => {
              // clear errors when cancelling
              setEditUserErrors({});
              setShowUserEdit(false);
            }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}

export default App;