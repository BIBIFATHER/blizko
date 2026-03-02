import React, { useRef, useState, useEffect } from 'react';
import { Button } from './UI';
import { X, Video, StopCircle, Upload, Camera } from 'lucide-react';
import { Language } from '../types';
import { t } from '../src/core/i18n/translations';

interface VideoRecorderModalProps {
  onClose: () => void;
  onSave: (url: string) => void;
  lang: Language;
}

export const VideoRecorderModal: React.FC<VideoRecorderModalProps> = ({ onClose, onSave, lang }) => {
  const text = t[lang];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'uploading' | 'done'>('idle');
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    // Start Camera on Mount
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, 
          audio: true 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        setPermissionError(true);
      }
    };

    startCamera();

    return () => {
      // Cleanup: Stop all tracks
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Timer Logic
  useEffect(() => {
    let interval: number;
    if (recordingState === 'recording') {
      interval = window.setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recordingState]);

  const handleStartRecording = () => {
    setRecordingState('recording');
    setTimer(0);
  };

  const handleStopRecording = () => {
    setRecordingState('uploading');
    
    // Simulate Upload Delay
    setTimeout(() => {
      setRecordingState('done');
      // Pass a mock URL or potentially a blob URL if we actually recorded
      onSave("mock_video_url.mp4");
    }, 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden animate-slide-up flex flex-col relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-20 text-white drop-shadow-md hover:scale-110 transition-transform"
        >
          <X size={24} />
        </button>

        {/* Video Area */}
        <div className="relative aspect-[3/4] bg-stone-800 flex items-center justify-center overflow-hidden">
          {permissionError ? (
            <div className="text-center p-6 text-stone-300">
              <Camera size={48} className="mx-auto mb-4 opacity-50" />
              <p>{text.cameraPermission}</p>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${recordingState === 'uploading' ? 'opacity-50' : 'opacity-100'}`}
              />
              
              {/* Overlays */}
              <div className="absolute top-4 left-4 z-10">
                 <div className="bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-medium flex items-center gap-2">
                    {recordingState === 'recording' && (
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                    {recordingState === 'recording' ? formatTime(timer) : text.videoModalTitle}
                 </div>
              </div>

              {recordingState === 'uploading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <Upload size={32} className="animate-bounce mb-2" />
                  <span className="font-semibold">{text.uploading}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 bg-white text-center">
          <p className="text-stone-500 text-sm mb-6 min-h-[40px]">
            {text.videoModalHint}
          </p>

          <div className="flex justify-center">
            {recordingState === 'idle' && (
              <button 
                onClick={handleStartRecording}
                disabled={permissionError}
                className="w-16 h-16 rounded-full border-4 border-amber-200 bg-amber-400 flex items-center justify-center text-stone-900 shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                <div className="w-6 h-6 bg-stone-900 rounded-full" />
              </button>
            )}

            {recordingState === 'recording' && (
              <button 
                onClick={handleStopRecording}
                className="w-16 h-16 rounded-full border-4 border-red-200 bg-red-500 flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                <StopCircle size={32} />
              </button>
            )}
            
            {recordingState === 'uploading' && (
               <div className="h-16 flex items-center justify-center">
                 <div className="w-8 h-8 border-4 border-stone-200 border-t-amber-400 rounded-full animate-spin" />
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};