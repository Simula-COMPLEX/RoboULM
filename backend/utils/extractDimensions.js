// Utility to extract specified dimension information from structured text input.
// Used in backend processing to parse dimension details from textual data blocks.

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
// List of dimension identifiers expected in the input text.
// Each dimension is followed by a colon and its description, potentially multi-line.

function extractDimensions(text) {
  // Parses input text to extract descriptions for each dimension.
  // Returns an object mapping dimension names to their extracted text.
  const result = {};

  DIMENSIONS.forEach(dim => {
    // Regex matches the dimension label followed by colon, capturing all text up to next dimension or end.
    // Uses non-greedy match to capture multi-line blocks until a line starting with '- ' and uppercase letters or end of string.
    const regex = new RegExp(`${dim}:([\\s\\S]*?)(?=\\n\\s*-\\s*[A-Z]|$)`, "i");
    const match = text.match(regex);

    result[dim] = match
      ? // Trim whitespace, replace multiple spaces/newlines with single space,
        // and strip enclosing parentheses if present to clean the extracted description.
        match[1].trim().replace(/\s+/g, " ").replace(/^\((.*)\)$/, "$1")
        .trim()
      : ""; // If dimension not found, assign empty string.
  });

  return result;
}

// Export the extractDimensions function for use in other modules.
module.exports = extractDimensions;