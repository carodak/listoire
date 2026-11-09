import copy
import base64
import io
import wave
import math
import struct
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import narration


class NarrationTests(unittest.TestCase):
    def test_edge_trimming_preserves_the_pause_between_two_spoken_parts(self):
        with tempfile.TemporaryDirectory() as directory:
            source, output = Path(directory) / 'source.wav', Path(directory) / 'output.wav'
            rate = 24000
            tone = [int(8000 * math.sin(2 * math.pi * 330 * i / rate)) for i in range(rate // 2)]
            samples = [0] * rate + tone + [0] * (rate // 2) + tone + [0] * rate
            with wave.open(str(source), 'wb') as audio:
                audio.setnchannels(1); audio.setsampwidth(2); audio.setframerate(rate)
                audio.writeframes(struct.pack('<' + 'h' * len(samples), *samples))
            subprocess.run(['ffmpeg', '-v', 'error', '-i', str(source), '-af', narration.edge_silence_filter(), str(output)], check=True)
            with wave.open(str(output), 'rb') as audio:
                duration = audio.getnframes() / audio.getframerate()
            self.assertGreater(duration, 1.45)
            self.assertLess(duration, 1.7)

    def test_custom_voice_settings_and_reference_are_bounded_and_change_cache_identity(self):
        audio = io.BytesIO()
        with wave.open(audio, 'wb') as wav:
            wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(24000)
            wav.writeframes(b'\0\0' * 24000 * 6)
        reference = {"name":"example.wav", "rights":"Speaker consent", "data":"data:audio/wav;base64," + base64.b64encode(audio.getvalue()).decode()}
        settings = {"temperature":.7,"exaggeration":.4,"cfgWeight":.4,"seed":123,"pitch":2}
        request = {"storyId":"house","locale":"en","segmentId":"intro.p1","text":"A test.","voiceId":"voice.test","profile":{"id":"voice.test","label":"Test","model":"nano","reference":reference},"settings":settings,"settingsKey":"a"*64}
        segment, voice = narration.authoring_segment(request)
        self.assertEqual(narration.effective_settings('nano', settings)['parameters'], {"temperature":.7})
        self.assertEqual(narration.effective_settings('multilingual-v3', settings)['parameters']['cfg_weight'], .4)
        self.assertNotEqual(narration.cache_key(segment,voice,{"revision":"one"}), narration.cache_key(segment,{**voice,"settings":{**settings,"pitch":3}},{"revision":"one"}))
        for patch_request in [{"settings":{**settings,"pitch":13}}, {"profile":{**request['profile'],"model":"unknown"}}, {"profile":{**request['profile'],"reference":{**reference,"data":"file:///secret.wav"}}}]:
            self.assertRaises(ValueError, narration.authoring_segment, {**request,**patch_request})
        with tempfile.TemporaryDirectory() as directory, patch.object(narration, 'CACHE', Path(directory)):
            self.assertTrue(Path(narration.reference_file(reference)).exists())
            with patch.object(narration.subprocess, 'check_output', return_value=b'{"format":{"duration":"31"}}'):
                self.assertRaises(ValueError, narration.reference_file, reference)

    def test_editor_preview_accepts_bounded_unsaved_text_without_changing_the_reader_allowlist(self):
        request = {"storyId":"house","locale":"en","segmentId":"intro.p1","text":"An unsaved author edit.","voiceId":"nano-default"}
        segment, voice = narration.authoring_segment(request)
        self.assertEqual(segment["text"], request["text"])
        self.assertEqual(segment["spokenTextDigest"], narration.sha(request["text"].encode()))
        self.assertEqual(voice["model"], "nano")
        for changed in [{**request,"text":"x"*10001},{**request,"segmentId":"../../file"},{**request,"path":"../../file"}]:
            self.assertRaises(ValueError,narration.authoring_segment,changed)
        self.assertRaises(StopIteration,narration.authoring_segment,{**request,"voiceId":"unknown"})
    def test_only_relevant_settings_invalidate_a_voice_and_stale_clips_are_not_published(self):
        segment = {"segmentId": "intro.p1", "text": "Hello", "locale": "en", "spokenTextDigest": "digest"}
        voice = narration.voice_for("en")
        model = {"id": "nano", "revision": "one"}
        key = narration.cache_key(segment, voice, model)
        entry = {"key": key, "clip": {"locale": "en", "segmentId": "intro.p1", "spokenTextDigest": "digest", "voiceId": voice["id"]}}
        self.assertEqual(len(narration.current_entries([entry], [segment], [model])), 1)
        with patch.dict(narration.CONFIG, {"settings": {**narration.CONFIG["settings"], "cfg_weight": 0.1}}):
            self.assertEqual(key, narration.cache_key(segment, voice, model))
        with patch.dict(narration.CONFIG, {"settings": {**narration.CONFIG["settings"], "nanoTemperature": 0.6}}):
            self.assertNotEqual(key, narration.cache_key(segment, voice, model))
            self.assertEqual(narration.current_entries([entry], [segment], [model]), {})
    def test_cache_identity_tracks_exact_text_locale_voice_and_model_revision(self):
        segment = {"segmentId": "intro.p1", "text": "Une photographie.", "locale": "fr"}
        voice = narration.voice_for("fr")
        model = {"revision": "one"}
        key = narration.cache_key(segment, voice, model)
        self.assertEqual(key, narration.cache_key(dict(segment), dict(voice), dict(model)))
        for changed in [{**segment, "text": "Une autre photographie."}, {**segment, "locale": "en"}, {**segment, "segmentId": "intro.p2"}]:
            self.assertNotEqual(key, narration.cache_key(changed, voice, model))
        self.assertNotEqual(key, narration.cache_key(segment, voice, {"revision": "two"}))

    def test_preview_accepts_only_exported_text_and_known_voices(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            narration.write(base / "segments.json", {"segments": [{"locale": "fr", "segmentId": "intro.p1", "text": "Bonjour."}]})
            request = {"storyId": "house", "locale": "fr", "segmentId": "intro.p1", "text": "Bonjour.", "voiceId": "multilingual-default"}
            with patch.object(narration, "BASE", base):
                self.assertEqual(narration.authorized_segment(request)[0]["text"], "Bonjour.")
                changed = {**request, "text": "Untrusted text"}
                self.assertRaises(ValueError, narration.authorized_segment, changed)
                self.assertRaises(StopIteration, narration.authorized_segment, {**request, "voiceId": "../../voice"})
                self.assertRaises(ValueError, narration.authorized_segment, {**request, "path": "../../file"})
