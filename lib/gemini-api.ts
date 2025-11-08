// Get the API key safely from the environment variables
// Make sure you created a .env.local file for this!
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// --- Interfaces ---
interface AnalysisResult {
  skinClarityScore?: number;
  oralHygieneScore?: number;
  score?: number;
  overallAssessment: string;
  keyProblemPoints: string[];
  detectedProblems: Array<{
    problem: string;
    description: string;
    suggestedTreatment: string;
  }>;
}

interface LiveExpressionResult {
  expressionText: string;
}

// --- analyzeFacialImages ---
export async function analyzeFacialImages(images: string[]): Promise<AnalysisResult> {
  if (!GEMINI_API_KEY) {
    console.error("Gemini API key is not configured.");
    throw new Error("Gemini API key is not configured.");
  }
  
  const base64Images = images.map((img) => img.split(",")[1]);

  const systemInstruction = `You are an expert facial analysis AI. Your task is to analyze patient images of their face to identify potential issues, suggest treatments, and provide a holistic summary. Respond in JSON format only. Do not wrap the JSON in markdown backticks.`;

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
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [
      {
        parts: [
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
    generationConfig: {
      responseMimeType: "application/json",
    },
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
    const responseText = data.candidates[0].content.parts[0].text;
    return JSON.parse(responseText);

  } catch (error) {
    console.error("[v0] Gemini API error (analyzeFacialImages):", error);
    throw error;
  }
}

// --- analyzeDentalImages ---
export async function analyzeDentalImages(images: string[]): Promise<AnalysisResult> {
  if (!GEMINI_API_KEY) {
    console.error("Gemini API key is not configured.");
    throw new Error("Gemini API key is not configured.");
  }
  
  const base64Images = images.map((img) => img.split(",")[1]);

  const systemInstruction = `You are an expert dental analysis AI. Your task is to analyze patient images of teeth to identify potential issues, suggest treatments, and provide a holistic summary. Respond in JSON format only. Do not wrap the JSON in markdown backticks.`;

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
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [
      {
        parts: [
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
    generationConfig: {
      responseMimeType: "application/json",
    },
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
    const responseText = data.candidates[0].content.parts[0].text;
    return JSON.parse(responseText);

  } catch (error) {
    console.error("[v0] Gemini API error (analyzeDentalImages):", error);
    throw error;
  }
}


// --- analyzeLiveExpression (FIXED) ---
// --- analyzeLiveExpression (FIXED AGAIN) ---
export async function analyzeLiveExpression(image: string): Promise<LiveExpressionResult> {
  if (!GEMINI_API_KEY) {
    console.warn("Gemini API key is missing. Live analysis skipped.");
    return { expressionText: "" };
  }

  const base64Image = image.split(",")[1];

  const systemInstruction = `You are a fun, encouraging AI assistant. Your task is to look at a single frame of a person and give a very short, positive comment about their expression in Hindi (like "wah kya muskurahat hai").
  - If the person is smiling, say "kya muskurahat hai!" or "bahut acchi smile hai!".
  - If they look happy, say "kitne khush lag rahe hain!".
  - If they look neutral or serious, say "thoda smile kijiye" or "camera ki taraf dekhiye".
  - If no clear face is visible, return an empty string: { "expressionText": "" }
  - Respond in JSON format only: { "expressionText": "<your_hindi_phrase>" }
  - Keep the phrase to 4-5 words maximum.`;
  
  const userPrompt = "Analyze this person's expression based on my instructions.";
  
  const requestBody = {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: userPrompt
          }
        ],
      },
    ],
    // 🌟 FIX: 'generationConfig' is separate...
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
    },
    // 🌟 ...and 'safetySettings' is at the same level.
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) { 
      const errorBody = await response.text(); 
      console.warn("Live analysis frame failed", response.statusText, errorBody); 
      return { expressionText: "" };
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates[0]?.finishReason === 'SAFETY') {
       console.warn("Live analysis blocked for safety or no candidate returned.");
       return { expressionText: "" };
    }
    
    if (!data.candidates[0].content?.parts[0]?.text) {
        console.warn("Live analysis returned empty part.");
        return { expressionText: "" };
    }

    const responseText = data.candidates[0].content.parts[0].text;
    try {
      const result = JSON.parse(responseText) as LiveExpressionResult;
      return result.expressionText ? result : { expressionText: "" };
    } catch (parseError) {
      console.warn("Failed to parse JSON response from live analysis:", responseText, parseError);
      return { expressionText: "" };
    }

  } catch (error) {
    console.warn("[v0] Gemini API error (analyzeLiveExpression):", error);
    return { expressionText: "" };
  }
}