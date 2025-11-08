// Get the API key safely from the environment variables
// Make sure you create a .env.local file for this!
const GEMINI_API_KEY = "AIzaSyC7EMJ9OU8CFSLW8dHEAagZPxxvylUFF9M"
// --- FIX 1: Updated Interface ---
// This interface now matches what your prompts and report page expect.
// It has 'skinClarityScore' and 'oralHygieneScore' as optional fields.
// gemini-api.ts


// --- FIX 1: Updated Interface ---
// This interface now matches what your prompts and report page expect.
// It has 'skinClarityScore' and 'oralHygieneScore' as optional fields.
interface AnalysisResult {
  skinClarityScore?: number;
  oralHygieneScore?: number;
  score?: number; // Added generic score as a fallback
  overallAssessment: string;
  keyProblemPoints: string[];
  detectedProblems: Array<{
    problem: string;
    description: string;
    suggestedTreatment: string;
  }>;
}

// --- 🌟 NEW INTERFACE FOR LIVE FEEDBACK 🌟 ---
interface LiveExpressionResult {
  expressionText: string;
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
      // Using 1.5-flash for speed and reliability
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


// --- 🌟 NEW FUNCTION FOR LIVE EXPRESSION ANALYSIS 🌟 ---
export async function analyzeLiveExpression(image: string): Promise<LiveExpressionResult> {
  // Check if API key is available
  if (!GEMINI_API_KEY) {
    console.error("Gemini API key is missing or is set to the placeholder.");
    return { expressionText: "" };
  }

  const base64Image = image.split(",")[1];

  // This prompt is specifically tuned for fast, emotive, and short feedback in Hindi
  const systemPrompt = `You are a fun, encouraging AI assistant. Your task is to look at a single frame of a person and give a very short, positive comment about their expression in Hindi (like "wah kya muskurahat hai").
  - If the person is smiling, say "kya muskurahat hai!" or "bahut acchi smile hai!".
  - If they look happy, say "kitne khush lag rahe hain!".
  - If they look neutral or serious, say "thoda smile kijiye" or "camera ki taraf dekhiye".
  - If no clear face is visible, return an empty string: { "expressionText": "" }
  - Respond in JSON format only: { "expressionText": "<your_hindi_phrase>" }
  - Keep the phrase to 4-5 words maximum.`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: systemPrompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      // Add a safety setting to avoid bad responses
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      ],
      // Make it fast
      temperature: 0.7,
    },
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      // Fail silently in the background
      console.warn("Live analysis frame failed", response.statusText);
      return { expressionText: "" };
    }

    const data = await response.json();
    
    // Check for safety ratings or blocked content
    if (!data.candidates || data.candidates[0]?.finishReason === 'SAFETY') {
       console.warn("Live analysis blocked for safety or no candidate returned.");
       return { expressionText: "" };
    }
    
    if (!data.candidates[0].content?.parts[0]?.text) {
        console.warn("Live analysis returned empty part.");
        return { expressionText: "" };
    }

    const responseText = data.candidates[0].content.parts[0].text;
    const result = JSON.parse(responseText) as LiveExpressionResult;
    
    // Handle cases where Gemini might return empty
    if (!result.expressionText) {
      return { expressionText: "" };
    }
    
    return result;

  } catch (error) {
    console.warn("[v0] Gemini API error (analyzeLiveExpression):", error);
    return { expressionText: "" }; // Don't stop the app on a single failed frame
  }
}