import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useTranscribeAudio } from '@/hooks/useChat';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface VoiceButtonProps {
  /** Called with transcribed text when recording is complete */
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export function VoiceButton({ onTranscription, disabled }: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcribe = useTranscribeAudio();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Use webm/opus — widely supported and Whisper handles it well
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        // Stop all tracks to release the mic
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(chunksRef.current, { type: mimeType });

        // Only transcribe if we have meaningful audio (> 1KB)
        if (audioBlob.size < 1000) {
          toast.error('Recording too short. Please speak for at least 1 second.');
          return;
        }

        transcribe.mutate(audioBlob, {
          onSuccess: (data) => {
            if (data.text) {
              onTranscription(data.text);
            } else {
              toast.error('No speech detected. Please try again.');
            }
          },
        });
      };

      recorder.start(250); // Collect data every 250ms
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access error:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        toast.error('No microphone found. Please connect a microphone.');
      } else {
        toast.error('Could not access microphone. Please check your settings.');
      }
    }
  }, [onTranscription, transcribe]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const isTranscribing = transcribe.isPending;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isTranscribing}
      title={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing...' : 'Voice input'}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-xl transition-all',
        isRecording
          ? 'bg-danger-500 text-white animate-pulse hover:bg-danger-600'
          : isTranscribing
            ? 'bg-primary-200 text-primary-500 cursor-wait'
            : 'border border-primary-200 bg-primary-50 text-primary-500 hover:border-accent-500 hover:bg-accent-50 hover:text-accent-600',
        (disabled || isTranscribing) && !isRecording && 'opacity-50 cursor-not-allowed',
      )}
    >
      {isTranscribing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  );
}
