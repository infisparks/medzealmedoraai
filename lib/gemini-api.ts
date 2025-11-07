const GEMINI_API_KEY = "AIzaSyC7EMJ9OU8CFSLW8dHEAagZPxxvylUFF9M"

interface AnalysisResult {
  score: number
  overallAssessment: string
  keyProblemPoints: string[]
  detectedProblems: Array<{
    problem: string
    description: string
    suggestedTreatment: string
  }>
}

export async function analyzeFacialImages(images: string[]): Promise<AnalysisResult> {
  const base64Images = images.map((img) => img.split(",")[1])

  const systemPrompt = `You are an expert facial analysis AI. Your task is to analyze patient images of their face to identify potential issues, suggest treatments, and provide a holistic summary. Respond in JSON format only.`

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
}`

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
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      },
    )

    if (!response.ok) {
      throw new Error("Gemini API call failed")
    }

    const data = await response.json()
    const responseText = data.candidates[0].content.parts[0].text

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Could not parse JSON response")
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error("[v0] Gemini API error:", error)
    throw error
  }
}

export async function analyzeDentalImages(images: string[]): Promise<AnalysisResult> {
  const base64Images = images.map((img) => img.split(",")[1])

  const systemPrompt = `You are an expert dental analysis AI. Your task is to analyze patient images of teeth to identify potential issues, suggest treatments, and provide a holistic summary. Respond in JSON format only.`

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
}`

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
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      },
    )

    if (!response.ok) {
      throw new Error("Gemini API call failed")
    }

    const data = await response.json()
    const responseText = data.candidates[0].content.parts[0].text

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Could not parse JSON response")
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error("[v0] Gemini API error:", error)
    throw error
  }
}
