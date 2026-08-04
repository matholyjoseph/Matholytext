import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { speechToText } from '../services/api';

const VoiceRecorder = ({ onTranscribe, selectedLang }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setIsProcessing(true);
        try {
          const result = await speechToText(audioBlob, selectedLang);
          if (result && result.text) {
            onTranscribe(result.text);
          }
        } catch (e) {
          console.error("Speech transcription error:", e);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone permission denied or unsupported:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <button
      onClick={isRecording ? stopRecording : startRecording}
      disabled={isProcessing}
      title={isRecording ? "Stop Recording" : "Record Voice"}
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justify: 'center',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        background: isRecording 
          ? 'linear-gradient(135deg, #ec4899, #ef4444)' 
          : 'rgba(255, 255, 255, 0.1)',
        color: '#fff'
      }}
      className={isRecording ? 'recording-pulse' : ''}
    >
      {isProcessing ? (
        <Loader2 size={20} className="animate-spin" />
      ) : isRecording ? (
        <Square size={18} fill="#fff" />
      ) : (
        <Mic size={20} />
      )}
    </button>
  );
};

export default VoiceRecorder;
