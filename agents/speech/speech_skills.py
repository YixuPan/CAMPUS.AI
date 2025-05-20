from semantic_kernel.functions.kernel_function_decorator import kernel_function
import os
import azure.cognitiveservices.speech as speechsdk

# --- SpeechSkill Plugin ---
class SpeechSkill:
    @kernel_function(name="listen_to_speech", description="Listen to speech input from microphone and convert to text")
    def listen_to_speech(self) -> str:
        speech_key = os.environ.get("SPEECH_KEY")
        speech_region = os.environ.get("SPEECH_REGION")
        if not speech_key or not speech_region:
            print(" Missing speech config in .env")
            return ""

        speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=speech_region)
        speech_config.speech_recognition_language = "en-US"

        audio_config = speechsdk.audio.AudioConfig(use_default_microphone=True)
        recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

        print(" Speak into your microphone...")
        result = recognizer.recognize_once_async().get()

        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            return result.text.strip()
        elif result.reason == speechsdk.ResultReason.NoMatch:
            print(" No speech recognized.")
        elif result.reason == speechsdk.ResultReason.Canceled:
            print(" Speech cancelled:", result.cancellation_details.reason)
        return ""

