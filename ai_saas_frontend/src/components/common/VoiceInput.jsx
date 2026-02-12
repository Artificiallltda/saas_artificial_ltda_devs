import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useLanguage } from '../../context/LanguageContext';

export default function VoiceInput({ onTranscript }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const { t, currentLanguage } = useLanguage();

  useEffect(() => {
    // Verificar suporte à Web Speech API em diferentes navegadores
    const hasWebkitSpeech = 'webkitSpeechRecognition' in window;
    const hasSpeech = 'SpeechRecognition' in window;
    
    if (!hasWebkitSpeech && !hasSpeech) {
      setIsSupported(false);
      return;
    }

    // Tentar usar a implementação disponível
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }
    
    const recognition = new SpeechRecognition();
    
    // Configurações otimizadas para diferentes navegadores
    recognition.continuous = false;
    recognition.interimResults = true;
    
    // Definir idioma baseado no idioma da interface
    recognition.lang = currentLanguage === 'en-US' ? 'en-US' : 'pt-BR';

    const setListeningState = (value) => {
      isListeningRef.current = value;
      setIsListening(value);
    };

    const stopRecognition = () => {
      const recognitionInstance = recognitionRef.current;
      if (!recognitionInstance) return;
      // "abort" encerra imediatamente em alguns navegadores onde "stop" demora.
      recognitionInstance.stop();
      recognitionInstance.abort();
    };

    recognition.onstart = () => {
      setListeningState(true);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');

      if (event.results[0].isFinal) {
        onTranscript(transcript);
      }
    };

    recognition.onerror = (event) => {
      setListeningState(false);
      
      const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
      const isBrave = navigator.brave !== undefined;
      
      let errorMessage = t('voice_input.error_recognition');
      switch (event.error) {
        case 'no-speech':
          errorMessage = t('voice_input.no_audio_detected');
          break;
        case 'audio-capture':
          errorMessage = t('voice_input.audio_capture_error');
          break;
        case 'not-allowed':
          errorMessage = t('voice_input.permission_denied');
          break;
        case 'network':
          if (isFirefox) {
            errorMessage = t('voice_input.firefox_network_error');
          } else if (isBrave) {
            errorMessage = t('voice_input.brave_network_error');
          } else {
            errorMessage = t('voice_input.network_error');
          }
          break;
        case 'service-not-allowed':
          if (isFirefox) {
            errorMessage = t('voice_input.firefox_service_error');
          } else {
            errorMessage = t('voice_input.service_error');
          }
          break;
        default:
          errorMessage = `Erro: ${event.error}`;
      }
      
      toast.error(errorMessage);
    };

    recognition.onend = () => {
      setListeningState(false);
    };

    recognitionRef.current = recognition;

    return () => {
      stopRecognition();
      setListeningState(false);
    };
  }, [onTranscript, currentLanguage]);

  const toggleListening = () => {
    if (!isSupported) {
      toast.error(t('voice_input.not_supported'));
      return;
    }

    if (isListeningRef.current) {
      isListeningRef.current = false;
      setIsListening(false);
      recognitionRef.current?.stop();
      recognitionRef.current?.abort();
    } else {
      try {
        isListeningRef.current = true;
        setIsListening(true);
        recognitionRef.current?.start();
      } catch (error) {
        isListeningRef.current = false;
        setIsListening(false);
        toast.error(t('voice_input.microphone_error'));
      }
    }
  };

  if (!isSupported) {
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
    const isBrave = navigator.brave !== undefined;
    
    let tooltip = t('voice_input.not_supported');
    if (isFirefox) {
      tooltip = t('voice_input.firefox_not_supported');
    } else if (isBrave) {
      tooltip = t('voice_input.brave_not_supported');
    }
    
    return (
      <button
        type="button"
        disabled={true}
        className="p-3 rounded-xl opacity-50 cursor-not-allowed bg-gray-100"
        title={tooltip}
      >
        <Mic className="w-6 h-6 text-gray-400" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`p-3 rounded-xl transition-all ${
        isListening 
          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/50' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:shadow-md'
      }`}
      title={isListening ? t('voice_input.stop_recording') : t('voice_input.start_recording')}
    >
      {isListening ? (
        <MicOff className="w-6 h-6" />
      ) : (
        <Mic className="w-6 h-6" />
      )}
    </button>
  );
}
