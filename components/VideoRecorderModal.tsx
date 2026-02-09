import React, { useRef, useState, useEffect } from 'react';
import { Button } from './UI';
import { X, StopCircle, Upload, Camera } from 'lucide-react';
import { Language } from '../types';
import { t } from '../src/core/i18n/translations';
import { supabase } from '../services/supabase';

interface VideoRecorderModalProps {
  onClose: () => void;
  onSave: (url: string) => void;
  lang: Language;
}

const VIDEO_BUCKET = (import.meta.env.VITE_SUPABASE_VIDEO_BUCKET as string | undefined) || 'nanny-videos';

export const VideoRecorderModal: React.FC<VideoRecorderModalProps> = ({ onClose, onSave, lang }) => {
  const text = t[lang];
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'uploading' | 'done'>('idle');
  const [timer, setTimer] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Camera error:', err);
        setPermissionError(true);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    let interval: number;
    if (recordingState === 'recording') {
      interval = window.setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recordingState]);

  const uploadToSupabase = async (blob: Blob): Promise<string | null> => {
    if (!supabase) return null;

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id || 'anonymous';
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const filePath = `${userId}/${Date.now()}-video-intro.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(VIDEO_BUCKET)
      .upload(filePath, blob, {
        contentType: blob.type || `video/${ext}`,
        upsert: false,
      });

    if (uploadError) {
      console.error('Video upload error:', uploadError.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(filePath);
    if (publicUrlData?.publicUrl) return publicUrlData.publicUrl;

    return null;
  };

  const handleStartRecording = () => {
    if (!stream) return;
    setErrorMsg('');

    const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    const selectedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';

    try {
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
        setRecordedBlob(blob);
        setRecordingState('uploading');

        const uploadedUrl = await uploadToSupabase(blob);

        if (uploadedUrl) {
          setRecordingState('done');
          onSave(uploadedUrl);
          return;
        }

        // Fallback: local blob URL (works in this browser session/local state only)
        const localUrl = URL.createObjectURL(blob);
        setErrorMsg(lang === 'ru' ? 'Видео сохранено локально (временный URL). Настройте Supabase Storage bucket для постоянного хранения.' : 'Video saved locally (temporary URL). Configure Supabase Storage bucket for persistent storage.');
        setRecordingState('done');
        onSave(localUrl);
      };

      recorder.start();
      setRecordedBlob(null);
      setRecordingState('recording');
      setTimer(0);
    } catch (e) {
      console.error('MediaRecorder start error:', e);
      setErrorMsg(lang === 'ru' ? 'Не удалось начать запись видео.' : 'Failed to start video recording.');
    }
  };

  const handleStopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canClose = recordingState !== 'uploading';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden animate-slide-up flex flex-col relative">
        <button
          onClick={() => canClose && onClose()}
          disabled={!canClose}
          className="absolute top-4 right-4 z-20 text-white drop-shadow-md hover:scale-110 transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          <X size={24} />
        </button>

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
                muted={recordingState !== 'done'}
                className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${recordingState === 'uploading' ? 'opacity-50' : 'opacity-100'}`}
              />

              <div className="absolute top-4 left-4 z-10">
                <div className="bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-medium flex items-center gap-2">
                  {recordingState === 'recording' && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
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

        <div className="p-6 bg-white text-center">
          <p className="text-stone-500 text-sm mb-3 min-h-[40px]">{text.videoModalHint}</p>

          {errorMsg && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2 mb-4">{errorMsg}</p>}

          {recordedBlob && recordingState === 'done' && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg p-2 mb-4">
              {lang === 'ru' ? 'Видеовизитка сохранена' : 'Video intro saved'}
            </p>
          )}

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

            {recordingState === 'done' && (
              <Button onClick={onClose} className="px-6">
                {lang === 'ru' ? 'Готово' : 'Done'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
