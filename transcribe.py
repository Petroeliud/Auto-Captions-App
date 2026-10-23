#!/usr/bin/env python3
"""
transcribe.py - Local speech-to-text script using faster-whisper for CapCut Auto Captions Desktop.
Extracts word-level timestamps and prints structured JSON.

Usage:
    python transcribe.py --video "path/to/video.mp4" --language "en" --model "small"
"""

import sys
import json
import argparse
import os

def transcribe_video(video_path, language="auto", model_size="small", compute_type="int8", device="cpu"):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print(json.dumps({
            "error": "faster-whisper is not installed. Please run: pip install faster-whisper",
            "missing_dependency": "faster-whisper"
        }))
        sys.exit(1)

    if not os.path.exists(video_path):
        print(json.dumps({
            "error": f"Video file not found: {video_path}"
        }))
        sys.exit(1)

    try:
        # Load model (CPU with int8 quantization is fast and portable)
        # Device can be 'cuda' if user has NVIDIA GPU or 'cpu'
        model = WhisperModel(model_size, device=device, compute_type=compute_type)

        lang_arg = None if language in ["auto", "Auto-detect", "", None] else language

        segments_raw, info = model.transcribe(
            video_path,
            language=lang_arg,
            word_timestamps=True,
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        detected_language = info.language
        duration = info.duration

        segments_list = []
        words_flat = []

        for segment in segments_raw:
            seg_words = []
            if segment.words:
                for w in segment.words:
                    word_obj = {
                        "word": w.word.strip(),
                        "start": round(w.start, 3),
                        "end": round(w.end, 3),
                        "probability": round(w.probability, 3)
                    }
                    seg_words.append(word_obj)
                    words_flat.append(word_obj)

            segments_list.append({
                "id": segment.id,
                "start": round(segment.start, 3),
                "end": round(segment.end, 3),
                "text": segment.text.strip(),
                "words": seg_words
            })

        output = {
            "success": True,
            "detected_language": detected_language,
            "language_probability": round(info.language_probability, 3),
            "duration": round(duration, 3),
            "segments": segments_list,
            "all_words": words_flat
        }

        print(json.dumps(output, ensure_ascii=False, indent=2))

    except Exception as e:
        print(json.dumps({
            "error": f"Transcription failed: {str(e)}"
        }))
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transcribe video using faster-whisper")
    parser.add_argument("--video", required=True, help="Path to video file")
    parser.add_argument("--language", default="auto", help="Language code (e.g., en, sw, es, fr, auto)")
    parser.add_argument("--model", default="small", help="Whisper model size (tiny, base, small, medium, large-v3)")
    parser.add_argument("--device", default="cpu", help="Device to run on (cpu, cuda)")
    parser.add_argument("--compute_type", default="int8", help="Compute type (int8, float16, float32)")

    args = parser.parse_args()
    transcribe_video(args.video, args.language, args.model, args.compute_type, args.device)
