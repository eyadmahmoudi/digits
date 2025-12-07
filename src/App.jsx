import React, { useState, useRef, useEffect } from 'react';
import { Check, Trash2, AlertCircle } from 'lucide-react';

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
  const [totalInDatabase, setTotalInDatabase] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    loadTotalCount();
  }, []);

  const loadTotalCount = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/digits?select=count`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTotalInDatabase(data.length);
      }
    } catch (error) {
      console.error('Error loading count:', error);
    }
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
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
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveDigit = async () => {
    setIsSubmitting(true);
    setError('');
    const canvas = canvasRef.current;
    
    canvas.toBlob(async (blob) => {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 9);
      const filename = `digit_${currentDigit}_${timestamp}_${randomId}.png`;
      
      try {
        // Upload to Supabase Storage
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

        // Save metadata to database
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
        setTotalInDatabase(prev => prev + 1);
        setShowSuccess(true);
        
        clearCanvas();
        setTimeout(() => {
          setShowSuccess(false);
          setCurrentDigit((prev) => (prev + 1) % 10);
        }, 1500);
      } catch (error) {
        console.error('Error saving digit:', error);
        setError(`Failed to save: ${error.message}. Check console for details.`);
      } finally {
        setIsSubmitting(false);
      }
    }, 'image/png');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Handwritten Digit Collector
            </h1>
            <p className="text-gray-600">
              Help us build a better dataset by drawing digits
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{submissions}</div>
              <div className="text-xs text-gray-600">Your Submissions</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{totalInDatabase}</div>
              <div className="text-xs text-gray-600">Total in Database</div>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">{currentDigit}</div>
              <div className="text-xs text-gray-600">Current Digit</div>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Draw the digit "{currentDigit}"</strong> in the canvas below. 
              Try to center it and make it clear!
            </p>
          </div>

          <div className="mb-6">
            <div className="border-4 border-gray-300 rounded-lg overflow-hidden bg-white shadow-inner">
              <canvas
                ref={canvasRef}
                width={400}
                height={400}
                className="cursor-crosshair w-full touch-none"
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

          <div className="flex gap-4">
            <button
              onClick={clearCanvas}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={20} />
              Clear
            </button>
            <button
              onClick={saveDigit}
              disabled={isSubmitting}
              className={`flex-1 ${
                isSubmitting ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'
              } text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2`}
            >
              {showSuccess ? (
                <>
                  <Check size={20} />
                  Saved!
                </>
              ) : isSubmitting ? (
                'Uploading...'
              ) : (
                <>
                  <Check size={20} />
                  Submit
                </>
              )}
            </button>
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">All drawings stored in Supabase</p>
                <p>Admins can download all submitted digits from the database.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}