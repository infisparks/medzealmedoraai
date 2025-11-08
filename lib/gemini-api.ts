// Get the API key safely from the environment variables
// Make sure you create a .env.local file for this!
const GEMINI_API_KEY = "AIzaSyC7EMJ9OU8CFSLW8dHEAagZPxxvylUFF9M"
// --- FIX 1: Updated Interface ---
// This interface now matches what your prompts and report page expect.
// It has 'skinClarityScore' and 'oralHygieneScore' as optional fields.
interface AnalysisResult {
  skinClarityScore?: number;
  oralHygieneScore?: number;
  overallAssessment: string;
  keyProblemPoints: string[];
  detectedProblems: Array<{
    problem: string;
    description: string;
    suggestedTreatment: string;
  }>;
}

export async function analyzeFacialImages(images: string[]): Promise<AnalysisResult> {
  const base64Images = images.map((img) => img.split(",")[1]);

  const systemPrompt = `You are an expert facial analysis AI. Your task is to analyze patient images of their face to identify potential issues, suggest treatments, and provide a holistic summary. Respond in JSON format only. Do not wrap the JSON in markdown backticks.`;

  const userPrompt = `Analyze these 3 images of a patient's face and skin. Perform a comprehensive analysis to identify all visible potential skincare and aesthetic issues.

Provide the following JSON response:
{
  "skinClarityScore": <number 0-100>,
  "overallAssessment": "<2-sentence summary>",
  "keyProblemPoints": ["<point1>", "<point2>", "<point3>"],
  "detectedProblems": [
    {
      "problem": "<issue name>",
      "description": "<1-sentence description>",
      "suggestedTreatment": "<treatment>"
    }
  ]
}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: systemPrompt,
          },
          ...base64Images.map((base64) => ({
            inlineData: {
              mimeType: "image/jpeg",
              data: base64,
            },
          })),
          {
            text: userPrompt,
          },
        ],
      },
    ],
    // --- FIX 2: Added generationConfig to force JSON output ---
    generationConfig: {
      responseMimeType: "application/json",
    },
  };

  try {
    const response = await fetch(
      // --- FIX 3: Changed model from '2.5-flash' to '1.5-flash' ---
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini API call failed with response:", errorBody);
      throw new Error(`Gemini API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // --- FIX 4: Simplified JSON parsing ---
    // With 'responseMimeType: "application/json"', the model should return clean JSON.
    // The regex is no longer needed.
    const responseText = data.candidates[0].content.parts[0].text;
    
    // We still parse the text, as the API wraps the JSON object in a text string.
    return JSON.parse(responseText);

  } catch (error) {
    console.error("[v0] Gemini API error (analyzeFacialImages):", error);
    throw error;
  }
}

export async function analyzeDentalImages(images: string[]): Promise<AnalysisResult> {
  const base64Images = images.map((img) => img.split(",")[1]);

  const systemPrompt = `You are an expert dental analysis AI. Your task is to analyze patient images of teeth to identify potential issues, suggest treatments, and provide a holistic summary. Respond in JSON format only. Do not wrap the JSON in markdown backticks.`;

  const userPrompt = `Analyze these 3 images of a patient's teeth and gums. Perform a comprehensive analysis to identify all visible potential dental and oral health issues.

Provide the following JSON response:
{
  "oralHygieneScore": <number 0-100>,
  "overallAssessment": "<2-sentence summary>",
  "keyProblemPoints": ["<point1>", "<point2>", "<point3>"],
  "detectedProblems": [
    {
      "problem": "<issue name>",
      "description": "<1-sentence description>",
      "suggestedTreatment": "<treatment>"
    }
  ]
}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: systemPrompt,
          },
          ...base64Images.map((base64) => ({
            inlineData: {
              mimeType: "image/jpeg",
              data: base64,
            },
          })),
          {
            text: userPrompt,
          },
        ],
      },
    ],
    // --- FIX 2: Added generationConfig to force JSON output ---
    generationConfig: {
      responseMimeType: "application/json",
    },
  };

  try {
    const response = await fetch(
      // This model name was already correct
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini API call failed with response:", errorBody);
      throw new Error(`Gemini API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // --- FIX 4: Simplified JSON parsing ---
    const responseText = data.candidates[0].content.parts[0].text;
    return JSON.parse(responseText);

  } catch (error) {
    console.error("[v0] Gemini API error (analyzeDentalImages):", error);
    throw error;
  }
}