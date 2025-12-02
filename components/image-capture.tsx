"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { FormData } from "@/app/page"
import { useSpeechSynthesis } from "react-speech-kit"
import { analyzeLiveExpression } from "@/lib/gemini-api"
import { Sparkles } from "lucide-react"

interface ImageCaptureProps {
  formData: FormData & { patientId: string }
  onCapture: (images: string[], patientId: string) => void
}

// List of 20 Complimentary/Fun Hindi Dialogues
const STARTUP_DIALOGUES = [
  "Waah! Kya chehra hai!",
  "Aapki smile toh bohot pyaari hai.",
  
  "Arre waah! Aaj toh aap chamak rahe hain.",
  "Aapki aankhon mein alag hi chamak hai.",
  "Mashallah! Bahut khoobsurat.",
  "Chehre par kya noor hai aaj!",
  "Aapko dekh kar dil khush ho gaya.",
  "Bilkul film star lag rahe hain aap.",
  "Uff! Yeh ada, maar hi daalogi.",
  "Aapki hasi toh lajawab hai.",
  "Kamaal lag rahe hain aap aaj.",
  "Ek dum jhakaas!",
  "Aapki sadgi mein hi asli khubsurti hai.",
  "Subhanallah! Kya baat hai.",
  "Arre bas kijiye, camera bhi sharma jayega.",
  "Photo toh zabardast aane wali hai aaj.",
  "Chehre ki chamak toh dekho zara.",
  "Aapka andaaz sabse alag hai.",
  "Oho! Itni freshness?",
]

export default function ImageCapture({ formData, onCapture }: ImageCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  // --- LIVE FEEDBACK STATE ---
  const [liveFeedbackText, setLiveFeedbackText] = useState<string>("")
  const [isAnalyzingFrame, setIsAnalyzingFrame] = useState(false)

  // State to track used dialogues
  const [usedDialogues, setUsedDialogues] = useState<string[]>([])

  const { speak, speaking, voices } = useSpeechSynthesis()

  // Try to find Google Hindi, or fallback to any Hindi, or fallback to first voice
  const hindiVoice = voices.find((v: any) => v.lang.includes("hi") || v.lang.includes("HI")) || voices[0]

  // Effect to start the camera
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      console.error("FATAL: NEXT_PUBLIC_GEMINI_API_KEY is missing from .env.local")
      setError("AI configuration is missing. Please contact support.")
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        })

        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          video.onloadedmetadata = () => {
            video.play().catch((err) => {
              console.error("Video play failed:", err)
              setError("Failed to play video. Please check permissions.")
            })
            setIsLoading(false)
          }
        }
      } catch (err) {
        console.error("Camera access error:", err)
        setError("Unable to access camera. Please check permissions.")
        setIsLoading(false)
      }
    }

    startCamera()

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voices]) 

  // --- EFFECT FOR LIVE ANALYSIS ---
  useEffect(() => {
    if (isLoading || error || !hasStarted) {
      return
    }

    const analysisInterval = setInterval(() => {
      // Ensure we don't interrupt if the startup dialogue is just about to be spoken (basic check)
      if (!isAnalyzingFrame && !isSubmitting && videoRef.current && canvasRef.current) {
        const videoWidth = videoRef.current.videoWidth
        const videoHeight = videoRef.current.videoHeight

        if (videoWidth === 0 || videoHeight === 0) {
          return
        }

        setIsAnalyzingFrame(true)

        const context = canvasRef.current.getContext("2d")
        if (context) {
          canvasRef.current.width = 480
          canvasRef.current.height = (videoHeight * 480) / videoWidth
          context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)
          const photoData = canvasRef.current.toDataURL("image/jpeg", 0.5)

          // Pass the 'usedDialogues' list to the API
          analyzeLiveExpression(photoData, formData.fullName, formData.serviceType, usedDialogues)
            .then((result) => {
              // Only speak if not currently speaking to avoid overlapping the random startup dialogue
              if (result.expressionText && !usedDialogues.includes(result.expressionText) && !speaking) {
                setLiveFeedbackText(result.expressionText)
                setUsedDialogues((prev) => [...prev, result.expressionText]) 

                speak({
                  text: result.expressionText,
                  voice: hindiVoice || undefined,
                  rate: 0.9, 
                  pitch: 1.0, 
                })
              } 
            })
            .catch((err) => {
              console.warn("Frame analysis failed:", err)
            })
            .finally(() => {
              setIsAnalyzingFrame(false)
            })
        } else {
          setIsAnalyzingFrame(false)
        }
      }
    }, 4000) // Increased interval slightly so the random startup dialogue has time to finish

    return () => clearInterval(analysisInterval)
  }, [isLoading, error, hasStarted, isAnalyzingFrame, isSubmitting, speak, hindiVoice, formData, usedDialogues, speaking])

  // Function to handle the "Start" click
  const handleStartSession = () => {
    setHasStarted(true)
    
    // 1. Wait 3-4 seconds (3500ms)
    setTimeout(() => {
      // 2. Pick 1 random dialogue
      const randomIndex = Math.floor(Math.random() * STARTUP_DIALOGUES.length);
      const randomDialogue = STARTUP_DIALOGUES[randomIndex];

      // 3. Update UI
      setLiveFeedbackText(randomDialogue);
      setUsedDialogues((prev) => [...prev, randomDialogue]); 

      // 4. Speak using TTS
      speak({
        text: randomDialogue,
        voice: hindiVoice || undefined,
        rate: 0.9,
        pitch: 1.0,
      })
    }, 3500); 
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      if (videoRef.current.videoWidth === 0) {
        console.error("Cannot capture photo, video not ready.")
        return
      }

      const context = canvasRef.current.getContext("2d")
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0)

        const photoData = canvasRef.current.toDataURL("image/jpeg", 0.9)
        setCapturedPhotos([...capturedPhotos, photoData])

        const video = videoRef.current
        video.style.opacity = "0.3"
        setTimeout(() => {
          video.style.opacity = "1"
        }, 200)
      }
    }
  }

  // Handle final submission
  const handleSubmit = async () => {
    setIsSubmitting(true)
    await onCapture(capturedPhotos, formData.patientId)
    setIsSubmitting(false)
  }

  const serviceLabel = formData.serviceType === "medzeal" ? "Medzeal Facial Scan" : "Medora Dental Scan"
  const isAllCaptured = capturedPhotos.length === 3

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl bg-card border border-border rounded-xl overflow-hidden shadow-lg">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">{serviceLabel}</h1>
            <p className="text-muted-foreground">Professional analysis in progress</p>
          </div>

          {/* Error State */}
          {error && (
            <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Video/Loading State */}
          <div className="relative bg-background rounded-lg overflow-hidden aspect-video">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                  <div className="inline-block">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-muted-foreground">Initializing camera...</p>
                </div>
              </div>
            )}
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!error && !isLoading && (
              <div className="absolute inset-0 border-4 border-accent/30 rounded-lg pointer-events-none" />
            )}

            {/* "Start" button overlay */}
            {!hasStarted && !isLoading && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10">
                <p className="text-lg font-medium text-white mb-6">Ready for your analysis?</p>
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 px-6 rounded-full text-lg"
                  onClick={handleStartSession}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Live Assistant
                </Button>
              </div>
            )}
          </div>

          {/* Robot and Live Feedback Area */}
          {!isLoading && !error && hasStarted && (
            <div className="relative flex items-end justify-center h-40">
              {/* Robot Image with Animation */}
              <img
                src="/robot.png" 
                alt="AI Assistant Robot"
                className="h-32 w-auto animate-float absolute bottom-0 left-1/2 -translate-x-1/2" 
              />

              {/* Speech Bubble */}
              {liveFeedbackText && (
                <div
                  className={`absolute bottom-20 right-1/2 translate-x-[calc(50%+60px)] z-20 transition-all duration-300 ${
                    liveFeedbackText ? "opacity-100" : "opacity-0"
                  } ${speaking && "opacity-100"}`} // Stay visible while speaking
                >
                  <div className="relative bg-accent text-accent-foreground px-4 py-2 rounded-xl shadow-md max-w-[200px] text-sm text-center">
                    {liveFeedbackText}
                    {/* Speech bubble tail */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-accent translate-y-[10px]"></div>
                  </div>
                </div>
              )}

              {/* Speaking Effect */}
              {speaking && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-0.5 items-end h-5 w-10 flex-shrink-0">
                  <span className="w-1 bg-accent animate-speak-bar" style={{ animationDelay: "0s" }}></span>
                  <span className="w-1 bg-accent animate-speak-bar" style={{ animationDelay: "0.2s" }}></span>
                  <span className="w-1 bg-accent animate-speak-bar" style={{ animationDelay: "0.4s" }}></span>
                  <span className="w-1 bg-accent animate-speak-bar" style={{ animationDelay: "0.6s" }}></span>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="text-center">
            <p className="text-foreground font-medium mb-2">
              Please position your {formData.serviceType === "medzeal" ? "face" : "teeth"} in the frame.
            </p>
            <p className="text-muted-foreground text-sm">We will capture 3 photos</p>
          </div>

          {/* Capture Button */}
          {!isAllCaptured && !isSubmitting && hasStarted && (
            <div className="flex justify-center">
              <button
                onClick={capturePhoto}
                disabled={isLoading || error !== null}
                className="w-20 h-20 rounded-full bg-accent hover:bg-accent/90 flex items-center justify-center shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-10 h-10 text-accent-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" />
                </svg>
              </button>
            </div>
          )}

          {/* Photo Gallery */}
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((index) => (
              <div
                key={index}
                className="aspect-square rounded-lg bg-background border-2 border-accent/30 flex items-center justify-center overflow-hidden"
              >
                {capturedPhotos[index - 1] ? (
                  <img
                    src={capturedPhotos[index - 1]}
                    alt={`Photo ${index}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm">Photo {index}/3</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Status */}
          <div className="text-center">
            <p className="text-muted-foreground text-sm">{capturedPhotos.length} of 3 photos captured</p>
          </div>

          {/* Submit Button */}
          {isAllCaptured && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting} // Disable button when submitting
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 rounded-lg transition-all disabled:opacity-70"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing in Progress...</span>
                </div>
              ) : (
                "Analyze My Images"
              )}
            </Button>
          )}

          {/* Hidden Canvas for capturing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </Card>
    </div>
  )
}