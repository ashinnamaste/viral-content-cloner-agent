import React, { useState, useEffect } from 'react'
import io from 'socket.io-client'

const API_URL = 'http://localhost:5002'

function App() {
  // Step management
  const [currentStep, setCurrentStep] = useState(1)
  const [inputMode, setInputMode] = useState('scrape') // 'scrape' or 'paste'

  // Step 1 state
  const [channelUrl, setChannelUrl] = useState('')
  const [limit, setLimit] = useState(10)
  const [isExtracting, setIsExtracting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [logs, setLogs] = useState([])
  const [socket, setSocket] = useState(null)
  const [extractedSubtitles, setExtractedSubtitles] = useState('')
  const [videosProcessed, setVideosProcessed] = useState(0)
  const [pastedSubtitles, setPastedSubtitles] = useState('')

  // Step 2 state
  const [isGeneratingDNA, setIsGeneratingDNA] = useState(false)
  const [viralDNA, setViralDNA] = useState('')

  // Step 3 state
  const [videoTopic, setVideoTopic] = useState('')
  const [isGeneratingScript, setIsGeneratingScript] = useState(false)
  const [finalScript, setFinalScript] = useState('')

  useEffect(() => {
    const newSocket = io(API_URL)
    setSocket(newSocket)

    newSocket.on('connect', () => {
      console.log('Connected to server')
      addLog('Connected to server', 'success')
    })

    newSocket.on('progress', (data) => {
      console.log('Progress:', data)
      setProgress(data.progress || 0)
      setStatusMessage(data.message || '')
      addLog(data.message, data.status)

      if (data.status === 'complete') {
        setIsExtracting(false)
        setVideosProcessed(data.videos_processed || 0)
        fetchSubtitles()
      } else if (data.status === 'error') {
        setIsExtracting(false)
      }
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
      addLog('Disconnected from server', 'warning')
    })

    return () => newSocket.close()
  }, [])

  const addLog = (message, status) => {
    setLogs(prev => [...prev, { message, status, time: new Date().toLocaleTimeString() }])
  }

  const fetchSubtitles = async () => {
    try {
      const response = await fetch(`${API_URL}/api/subtitles`)
      if (response.ok) {
        const data = await response.json()
        setExtractedSubtitles(data.content)
        setVideosProcessed(data.videos_processed)
      }
    } catch (error) {
      console.error('Failed to fetch subtitles:', error)
    }
  }

  const handleExtract = async () => {
    if (!channelUrl.trim()) {
      alert('Please enter a YouTube channel URL')
      return
    }

    setIsExtracting(true)
    setProgress(0)
    setLogs([])
    setExtractedSubtitles('')
    setStatusMessage('Starting extraction...')

    try {
      const response = await fetch(`${API_URL}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_url: channelUrl, limit: limit })
      })

      if (!response.ok) throw new Error('Failed to start extraction')
      addLog('Extraction started', 'info')
    } catch (error) {
      setIsExtracting(false)
      addLog(`Error: ${error.message}`, 'error')
      alert(`Error: ${error.message}`)
    }
  }

  const handleSkipToStep2 = () => {
    if (!pastedSubtitles.trim()) {
      alert('Please paste your subtitles first')
      return
    }
    setExtractedSubtitles(pastedSubtitles)
    setVideosProcessed(0) // Unknown count for pasted subtitles
    setCurrentStep(2)
  }

  const handleCopySubtitles = () => {
    navigator.clipboard.writeText(extractedSubtitles)
    alert('Subtitles copied to clipboard!')
  }

  const handleDownloadSubtitles = () => {
    const blob = new Blob([extractedSubtitles], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'subtitles.txt'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const handleGenerateViralDNA = async () => {
    if (!extractedSubtitles) {
      alert('No subtitles available. Please extract videos first.')
      return
    }

    setIsGeneratingDNA(true)
    try {
      const response = await fetch(`${API_URL}/api/generate-viral-dna`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtitles: extractedSubtitles })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to generate Viral DNA')

      setViralDNA(data.viral_dna)
      setCurrentStep(3)
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setIsGeneratingDNA(false)
    }
  }

  const handleGenerateScript = async () => {
    if (!viralDNA) {
      alert('No Viral DNA available. Please generate it first.')
      return
    }
    if (!videoTopic.trim()) {
      alert('Please enter your video topic')
      return
    }

    setIsGeneratingScript(true)
    try {
      const response = await fetch(`${API_URL}/api/generate-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viral_dna: viralDNA, topic: videoTopic })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to generate script')

      setFinalScript(data.script)
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setIsGeneratingScript(false)
    }
  }

  const handleCopyViralDNA = () => {
    navigator.clipboard.writeText(viralDNA)
    alert('Viral DNA copied to clipboard!')
  }

  const handleDownloadViralDNA = () => {
    const blob = new Blob([viralDNA], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'viral_dna_analysis.txt'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const handleCopyScript = () => {
    navigator.clipboard.writeText(finalScript)
    alert('Script copied to clipboard!')
  }

  const handleDownloadScript = () => {
    const blob = new Blob([finalScript], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'viral_script.txt'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete': return 'text-green-400'
      case 'error': return 'text-red-400'
      case 'warning': return 'text-yellow-400'
      case 'extracting': return 'text-blue-400'
      default: return 'text-gray-400'
    }
  }

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
              currentStep >= step
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {step}
          </div>
          {step < 3 && (
            <div
              className={`w-16 h-1 mx-2 transition-all ${
                currentStep > step ? 'bg-purple-500' : 'bg-gray-700'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse-slow"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse-slow" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse-slow" style={{animationDelay: '4s'}}></div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
            Viral Script Generator
          </h1>
          <p className="text-xl text-purple-200">
            Extract viral patterns → Generate Viral DNA → Create your script
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator />

        {/* Main card */}
        <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-purple-500/30">

          {/* STEP 1: Extract or Paste Subtitles */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Step 1: Get Subtitles</h2>

              {/* Mode Toggle */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setInputMode('scrape')}
                  className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                    inputMode === 'scrape'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Scrape from YouTube
                </button>
                <button
                  onClick={() => setInputMode('paste')}
                  className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                    inputMode === 'paste'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Paste Subtitles
                </button>
              </div>

              {/* Scrape Mode */}
              {inputMode === 'scrape' && (
                <div className="space-y-6 mb-8">
                  <div>
                    <label className="block text-purple-200 font-semibold mb-2">
                      YouTube Channel URL
                    </label>
                    <input
                      type="text"
                      value={channelUrl}
                      onChange={(e) => setChannelUrl(e.target.value)}
                      placeholder="https://www.youtube.com/@channelname"
                      disabled={isExtracting}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-purple-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-purple-200 font-semibold mb-2">
                      Number of Videos (1-20)
                    </label>
                    <input
                      type="number"
                      value={limit}
                      onChange={(e) => setLimit(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                      min="1"
                      max="20"
                      disabled={isExtracting}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-purple-500/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    />
                    <p className="text-gray-400 text-sm mt-1">Extract 1 to 20 most popular videos from the channel</p>
                  </div>

                  <button
                    onClick={handleExtract}
                    disabled={isExtracting}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
                  >
                    {isExtracting ? 'Extracting...' : 'Start Extraction'}
                  </button>

                  {/* Progress section */}
                  {isExtracting && (
                    <div className="mt-6">
                      <div className="flex justify-between text-sm text-purple-200 mb-2">
                        <span>{statusMessage}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-900/50 rounded-full h-4 overflow-hidden border border-purple-500/30">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
                          style={{ width: `${progress}%` }}
                        >
                          <div className="h-full w-full bg-white/20 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Extraction complete */}
                  {extractedSubtitles && !isExtracting && (
                    <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-6 mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-green-400 mb-2">Extraction Complete!</h3>
                          <p className="text-green-200">
                            Successfully extracted {videosProcessed} viral video transcripts
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setCurrentStep(2)}
                        className="w-full py-4 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
                      >
                        Continue to Step 2 →
                      </button>
                    </div>
                  )}

                  {/* Logs section */}
                  {logs.length > 0 && (
                    <div className="bg-gray-900/50 rounded-lg border border-purple-500/30 p-4 max-h-64 overflow-y-auto mt-6">
                      <h3 className="text-lg font-semibold text-purple-200 mb-3">Activity Log</h3>
                      <div className="space-y-2 font-mono text-sm">
                        {logs.map((log, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <span className="text-gray-500 text-xs">{log.time}</span>
                            <span className={getStatusColor(log.status)}>{log.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Paste Mode */}
              {inputMode === 'paste' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-purple-200 font-semibold mb-2">
                      Paste Your Subtitles / Transcripts
                    </label>
                    <textarea
                      value={pastedSubtitles}
                      onChange={(e) => setPastedSubtitles(e.target.value)}
                      placeholder="Paste your video subtitles or transcripts here...

You can paste multiple video transcripts. For best results, include transcripts from several viral videos from the same creator."
                      rows={12}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-purple-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-mono text-sm"
                    />
                    <p className="text-gray-400 text-sm mt-2">
                      {pastedSubtitles.length > 0 && `${pastedSubtitles.length.toLocaleString()} characters`}
                    </p>
                  </div>

                  <button
                    onClick={handleSkipToStep2}
                    disabled={!pastedSubtitles.trim()}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
                  >
                    Continue to Step 2 →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Review Subtitles & Generate Viral DNA */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Step 2: Review Subtitles & Generate Viral DNA</h2>

              {/* Subtitles preview */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-purple-200 font-semibold">
                    Subtitles {videosProcessed > 0 && `(${videosProcessed} videos)`}
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopySubtitles}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all text-sm"
                    >
                      Copy
                    </button>
                    <button
                      onClick={handleDownloadSubtitles}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all text-sm"
                    >
                      Download .txt
                    </button>
                  </div>
                </div>
                <div className="bg-gray-900/50 border border-purple-500/30 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">
                    {extractedSubtitles.slice(0, 3000)}
                    {extractedSubtitles.length > 3000 && '\n\n... (truncated for preview)'}
                  </pre>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  {extractedSubtitles.length.toLocaleString()} characters total
                </p>
              </div>

              {/* Generate Viral DNA button */}
              <button
                onClick={handleGenerateViralDNA}
                disabled={isGeneratingDNA}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg mb-6"
              >
                {isGeneratingDNA ? 'Analyzing with Gemini AI...' : 'Generate Viral DNA Analysis'}
              </button>

              {isGeneratingDNA && (
                <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                    <p className="text-purple-200">Gemini AI is reverse-engineering the viral algorithm...</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setCurrentStep(1)}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all"
              >
                ← Back to Step 1
              </button>
            </div>
          )}

          {/* STEP 3: Enter Topic & Generate Script */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Step 3: Generate Your Viral Script</h2>

              {/* Viral DNA Preview */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-purple-200 font-semibold">
                    Viral DNA Analysis
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyViralDNA}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all text-sm"
                    >
                      Copy
                    </button>
                    <button
                      onClick={handleDownloadViralDNA}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all text-sm"
                    >
                      Download .txt
                    </button>
                  </div>
                </div>
                <div className="bg-gray-900/50 border border-purple-500/30 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">
                    {viralDNA.slice(0, 2000)}
                    {viralDNA.length > 2000 && '\n\n... (truncated for preview)'}
                  </pre>
                </div>
              </div>

              {/* Video topic input */}
              <div className="mb-6">
                <label className="block text-purple-200 font-semibold mb-2">
                  Your Video Topic / Idea
                </label>
                <textarea
                  value={videoTopic}
                  onChange={(e) => setVideoTopic(e.target.value)}
                  placeholder="Describe your video topic or idea... e.g., 'Why most people fail at investing' or 'The hidden psychology behind procrastination'"
                  disabled={isGeneratingScript}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-purple-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 resize-none"
                />
              </div>

              {/* Generate Script button */}
              <button
                onClick={handleGenerateScript}
                disabled={isGeneratingScript || !videoTopic.trim()}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg mb-6"
              >
                {isGeneratingScript ? 'Generating Script with Gemini AI...' : 'Generate Viral Script'}
              </button>

              {isGeneratingScript && (
                <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                    <p className="text-purple-200">Gemini AI is engineering your viral script...</p>
                  </div>
                </div>
              )}

              {/* Final Script Output */}
              {finalScript && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-green-400 font-semibold text-lg">
                      Your Viral Script
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyScript}
                        className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg transition-all text-sm"
                      >
                        Copy
                      </button>
                      <button
                        onClick={handleDownloadScript}
                        className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg transition-all text-sm"
                      >
                        Download .txt
                      </button>
                    </div>
                  </div>
                  <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="text-gray-200 text-sm whitespace-pre-wrap font-mono">
                      {finalScript}
                    </pre>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all"
                >
                  ← Back to Step 2
                </button>
                <button
                  onClick={() => {
                    setCurrentStep(1)
                    setExtractedSubtitles('')
                    setPastedSubtitles('')
                    setViralDNA('')
                    setFinalScript('')
                    setVideoTopic('')
                    setLogs([])
                  }}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="mt-8 text-center text-purple-200 text-sm">
          <p className="mb-2">
            Step 1: Extract transcripts from viral videos OR paste your own
          </p>
          <p className="mb-2">
            Step 2: Generate Viral DNA analysis using Gemini AI
          </p>
          <p>
            Step 3: Create your custom viral script based on the DNA
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
