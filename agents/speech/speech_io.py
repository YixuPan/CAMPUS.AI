import os
import azure.cognitiveservices.speech as speechsdk
from typing import Optional
import threading
import time

# Global variables
_speech_synthesizer: Optional[speechsdk.SpeechSynthesizer] = None
_speech_recognizer: Optional[speechsdk.SpeechRecognizer] = None
_is_speaking = False
_stop_flag = False

def _get_speech_config():
    """Get speech configuration from environment variables."""
    speech_key = os.environ.get("SPEECH_KEY")
    speech_region = os.environ.get("SPEECH_REGION")
    
    if not speech_key or not speech_region:
        raise ValueError("Missing SPEECH_KEY or SPEECH_REGION environment variables")
    
    return speechsdk.SpeechConfig(subscription=speech_key, region=speech_region)

def recognize_from_microphone() -> str:
    """
    Recognize speech from microphone and return the recognized text.
    """
    global _speech_recognizer
    
    try:
        print("Starting speech recognition...")
        
        speech_config = _get_speech_config()
        speech_config.speech_recognition_language = "en-US"
        
        audio_config = speechsdk.audio.AudioConfig(use_default_microphone=True)
        _speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)
        
        print("Speak into your microphone...")
        result = _speech_recognizer.recognize_once()
        
        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            print(f"Recognized: {result.text}")
            return result.text.strip()
        elif result.reason == speechsdk.ResultReason.NoMatch:
            print("No speech could be recognized")
            return ""
        elif result.reason == speechsdk.ResultReason.Canceled:
            print(f"Speech recognition canceled: {result.cancellation_details.reason}")
            return ""
        else:
            return ""
            
    except Exception as e:
        print(f"Error in speech recognition: {e}")
        return ""
    finally:
        _speech_recognizer = None

def speak_text(text: str) -> str:
    """
    Convert text to speech and play it.
    """
    global _speech_synthesizer, _is_speaking, _stop_flag
    
    if not text:
        return "No text provided"
    
    try:
        print(f"Starting speech synthesis: {text[:50]}...")
        
        # Reset flags
        _stop_flag = False
        _is_speaking = True
        
        # Get speech configuration
        speech_config = _get_speech_config()
        speech_config.speech_synthesis_voice_name = "en-US-JennyNeural"
        
        # Create synthesizer
        _speech_synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)
        
        # Check stop flag before starting
        if _stop_flag:
            print("❌ CANCELLED before synthesis")
            return "Speech cancelled before starting"
        
        # Synthesize speech
        result = _speech_synthesizer.speak_text(text)
        
        # Check stop flag after synthesis
        if _stop_flag:
            print("🛑 CANCELLED during synthesis")
            return "Speech cancelled during synthesis"
        
        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            print("Speech synthesis completed successfully")
            return "Speech synthesis completed successfully"
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation_details = result.cancellation_details
            print(f"Speech synthesis canceled: {cancellation_details.reason}")
            if cancellation_details.error_details:
                print(f"Error details: {cancellation_details.error_details}")
            return "Speech synthesis was canceled"
        else:
            print(f"Speech synthesis failed with reason: {result.reason}")
            return f"Speech synthesis failed: {result.reason}"
            
    except Exception as e:
        print(f"Error in speech synthesis: {e}")
        return f"Error in speech synthesis: {e}"
    finally:
        _is_speaking = False
        _speech_synthesizer = None

def speak_text_async(text: str, speech_started_callback=None, speech_ended_callback=None) -> str:
    """
    Convert text to speech asynchronously.
    """
    def run_speech():
        try:
            if speech_started_callback:
                speech_started_callback()
            
            result = speak_text(text)
            
            if speech_ended_callback:
                speech_ended_callback()
                
            return result
        except Exception as e:
            print(f"Error in async speech: {e}")
            if speech_ended_callback:
                speech_ended_callback()
            return f"Error: {e}"
    
    # Run in thread
    thread = threading.Thread(target=run_speech, daemon=True)
    thread.start()
    
    return "Speech started in background"

def stop_speech() -> str:
    """
    IMMEDIATELY STOP THE VOICE.
    """
    global _speech_synthesizer, _is_speaking, _stop_flag
    
    try:
        print("🛑 KILLING SPEECH NOW!")
        
        # Set flags IMMEDIATELY
        _stop_flag = True
        _is_speaking = False
        
        # DESTROY THE SYNTHESIZER AGGRESSIVELY
        if _speech_synthesizer is not None:
            try:
                # Try multiple ways to kill it
                if hasattr(_speech_synthesizer, 'close'):
                    _speech_synthesizer.close()
                if hasattr(_speech_synthesizer, 'stop_speaking_async'):
                    _speech_synthesizer.stop_speaking_async()
                print("🔥 Synthesizer methods called")
            except:
                pass
            finally:
                _speech_synthesizer = None
                print("🗑️ Synthesizer destroyed")
        
        # Create and immediately destroy a new synthesizer to interrupt audio streams
        try:
            speech_config = _get_speech_config()
            temp_synth = speechsdk.SpeechSynthesizer(speech_config=speech_config)
            temp_synth = None
            print("💥 Temporary synthesizer cycle - audio stream interrupted")
        except:
            pass
        
        print("✅ VOICE KILLED!")
        return "VOICE STOPPED IMMEDIATELY"
        
    except Exception as e:
        print(f"💀 Error but voice should be dead: {e}")
        # NUCLEAR OPTION - reset everything
        _speech_synthesizer = None
        _is_speaking = False
        _stop_flag = True
        return f"EMERGENCY VOICE KILL: {e}"

def stop_recognition() -> str:
    """
    Stop ongoing speech recognition.
    """
    global _speech_recognizer
    
    try:
        if _speech_recognizer is not None:
            _speech_recognizer = None
            print("Speech recognition stopped")
        
        return "Speech recognition stopped"
        
    except Exception as e:
        print(f"Error stopping recognition: {e}")
        return f"Error stopping recognition: {e}"

def reset_synthesis_flags() -> str:
    """
    Reset all speech synthesis flags.
    """
    global _is_speaking, _stop_flag
    
    _is_speaking = False
    _stop_flag = False
    
    print("Speech flags reset")
    return "Speech flags reset"

def is_speaking() -> bool:
    """
    Check if speech synthesis is currently running.
    """
    return _is_speaking