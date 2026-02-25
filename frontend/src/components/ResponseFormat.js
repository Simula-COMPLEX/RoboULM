// This module defines a shared response format template used throughout the application to standardize AI responses and ensure consistency in output structure.

// -----------------------------------------------------------------------------
// RESPONSE_FORMAT constant:
// This template string is used across the application to construct prompts for AI interactions.
// It ensures a consistent response format in initial prompts, iterative interactions, and refinement steps,
// enabling reliable parsing and interpretation of AI-generated content.
// -----------------------------------------------------------------------------
export const RESPONSE_FORMAT = `
RESPONSE FORMAT
- UNCERTAINTY: [1-3 sentence description]
- REASONING: { [1-3 sentences reasoning] }

- NATURE: (<Deterministic/Stochastic/Other>, <Static/Dynamic/Other>)
- REASONING: { [1-3 sentences reasoning] }

- TEMPORALCHARACTERISTICS: (<ShortTerm/LongTerm>, <Transient/Persistent/Other>)
- REASONING: { [1-3 sentences reasoning] }

- AFFECT: (<Performance/Safety/Adaptability/Reliability/Other>)
- REASONING: { [1-3 sentences reasoning] }

- OCCURRENCE: (<Environmental/Task/Interaction/Hardware/Software/Other>)
- REASONING: { [1-3 sentences reasoning] }

- SOURCEOFADAPTATION: (<External/Internal/Other>)
- REASONING: { [1-3 sentences reasoning] }

- SCOPE: (<Local/Global/Other>, <ComponentLevel/SystemLevel/Other>)
- REASONING: { [1-3 sentences reasoning] }

- PROPAGATION: (<Isolated/Cascading/Other>)
- REASONING: { [1-3 sentences reasoning] }

- RESOLUTIONMECHANISM: (<Reactive/Proactive/Other>, <Manual/Automated/Other>)
- REASONING: { [1-3 sentences reasoning] }

- SEVERITY: (<Minor/Major>, <LowRisk/HighRisk>)
- REASONING: { [1-3 sentences reasoning] }

- DATACHARACTERISTICS: (<Incomplete/Ambiguous/Noisy/Other>)
- REASONING: { [1-3 sentences reasoning] }

- ETHICALIMPLICATIONS: (<Trust/Transparency/Other>, <Bias/Fairness/Other>)
- REASONING: { [1-3 sentences reasoning] }
`;

// This file is intentionally kept free of business logic and serves solely as a single source of truth for the response format specification.