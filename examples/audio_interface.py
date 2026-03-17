"""
Custom audio interface using sounddevice (no pyaudio dependency).
Implements the ElevenLabs AudioInterface for mic input and speaker output.
"""

import threading
import numpy as np
import sounddevice as sd
from elevenlabs.conversational_ai.conversation import AudioInterface

SAMPLE_RATE = 16000
CHANNELS = 1
DTYPE = "int16"
CHUNK_SAMPLES = 4000  # 250ms at 16kHz


class SoundDeviceAudioInterface(AudioInterface):
    def __init__(self):
        self._input_stream = None
        self._output_stream = None
        self._input_callback = None
        self._output_buffer = b""
        self._output_lock = threading.Lock()
        self._playing = threading.Event()

    def start(self, input_callback):
        self._input_callback = input_callback

        self._input_stream = sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            dtype=DTYPE,
            blocksize=CHUNK_SAMPLES,
            callback=self._on_input,
        )
        self._input_stream.start()

        self._output_stream = sd.OutputStream(
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            dtype=DTYPE,
            blocksize=CHUNK_SAMPLES,
            callback=self._on_output,
        )
        self._output_stream.start()

    def stop(self):
        if self._input_stream:
            self._input_stream.stop()
            self._input_stream.close()
            self._input_stream = None
        if self._output_stream:
            self._output_stream.stop()
            self._output_stream.close()
            self._output_stream = None

    def output(self, audio: bytes):
        with self._output_lock:
            self._output_buffer += audio
        self._playing.set()

    def interrupt(self):
        with self._output_lock:
            self._output_buffer = b""
        self._playing.clear()

    def _on_input(self, indata, frames, time_info, status):
        if self._input_callback:
            self._input_callback(indata.tobytes())

    def _on_output(self, outdata, frames, time_info, status):
        bytes_needed = frames * CHANNELS * np.dtype(DTYPE).itemsize
        with self._output_lock:
            chunk = self._output_buffer[:bytes_needed]
            self._output_buffer = self._output_buffer[bytes_needed:]

        if len(chunk) < bytes_needed:
            chunk += b"\x00" * (bytes_needed - len(chunk))

        outdata[:] = np.frombuffer(chunk, dtype=DTYPE).reshape(-1, CHANNELS)
