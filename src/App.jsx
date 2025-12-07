import React, { useState, useRef, useEffect } from 'react';
import { Check, Trash2, RotateCcw } from 'lucide-react';

// ⚠️ REPLACE THESE WITH YOUR SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://wkezmkvfkreqnuahbseh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZXpta3Zma3JlcW51YWhic2VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjAwMDcsImV4cCI6MjA4MDY5NjAwN30.G43IGhKMRuJbXGMdt1MNisLWvCUb4RzjiwTdny3WvsY';

export default function App() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDigit, setCurrentDigit] = useState(0);
  const [submissions, setSubmissions] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if (e.touches && e.touches[0]) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);
    
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveDigit = async () => {
    setIsSubmitting(true);
    setError('');
    const canvas = canvasRef.current;
    
    // Create a temporary 28x28 canvas for saving
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 28;
    tempCanvas.height = 28;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Draw the original canvas scaled down to 28x28
    tempCtx.drawImage(canvas, 0, 0, 28, 28);
    
    tempCanvas.toBlob(async (blob) => {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 9);
      const filename = `digit_${currentDigit}_${timestamp}_${randomId}.png`;
      
      try {
        const storageResponse = await fetch(
          `${SUPABASE_URL}/storage/v1/object/digits/${currentDigit}/${filename}`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'image/png'
            },
            body: blob
          }
        );

        if (!storageResponse.ok) {
          const errorData = await storageResponse.json();
          throw new Error(errorData.message || 'Failed to upload image');
        }

        const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/digits`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            digit: currentDigit,
            filename: filename,
            path: `${currentDigit}/${filename}`,
            created_at: new Date().toISOString()
          })
        });

        if (!dbResponse.ok) {
          const errorData = await dbResponse.json();
          throw new Error(errorData.message || 'Failed to save to database');
        }

        setSubmissions(prev => prev + 1);
        setShowSuccess(true);
        
        clearCanvas();
        setTimeout(() => {
          setShowSuccess(false);
          setCurrentDigit((prev) => (prev + 1) % 10);
        }, 1200);
      } catch (error) {
        console.error('Error saving digit:', error);
        setError(`Failed to save: ${error.message}`);
      } finally {
        setIsSubmitting(false);
      }
    }, 'image/png');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          
          {/* Large Digit Display */}
          <div className="text-center mb-8">
            <div className="inline-block bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl px-12 py-8 shadow-lg">
              <div className="text-8xl font-bold">{currentDigit}</div>
            </div>
            <p className="text-gray-600 mt-4 text-lg">Draw this digit</p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}


          {/* Canvas */}
          <div className="mb-6">
            <div className="border-4 border-gray-300 rounded-2xl overflow-hidden bg-white shadow-lg">
              <canvas
                ref={canvasRef}
                width={500}
                height={500}
                className="w-full cursor-crosshair touch-none"
                style={{ touchAction: 'none' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={clearCanvas}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg"
            >
              <RotateCcw size={22} />
              Clear
            </button>
            <button
              onClick={saveDigit}
              disabled={isSubmitting}
              className={`flex-1 ${
                isSubmitting 
                  ? 'bg-gray-400' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
              } text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg`}
            >
              {showSuccess ? (
                <>
                  <Check size={22} />
                  Saved!
                </>
              ) : isSubmitting ? (
                'Saving...'
              ) : (
                <>
                  <Check size={22} />
                  Submit
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500">
            <p>Thank you for contributing to our dataset! 🎉</p>
          </div>
        </div>
      </div>
    </div>
  );
}