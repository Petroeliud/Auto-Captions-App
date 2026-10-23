#!/usr/bin/env python3
"""
transcribe.py - Local speech-to-text script using faster-whisper for CapCut Auto Captions.
Extracts word-level timestamps and prints structured JSON to stdout.

Usage:
    python transcribe.py "path/to/video.mp4" "en"
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
        err_msg = "faster-whisper is not installed. Please run: pip install faster-whisper"
        sys.stderr.write(err_msg + "\n")
        print(json.dumps({
            "success": False,
            "error": err_msg,
            "missing_dependency": "faster-whisper"
        }))
        sys.exit(1)

    if not os.path.exists(video_path):
        err_msg = f"Video file not found at path: {video_path}"
        sys.stderr.write(err_msg + "\n")
        print(json.dumps({
            "success": False,
            "error": err_msg
        }))
        sys.exit(1)

    try:
        sys.stderr.write(f"Loading faster-whisper model '{model_size}' on {device} ({compute_type})...\n")
        model = WhisperModel(model_size, device=device, compute_type=compute_type)

        lang_arg = None if language in ["auto", "Auto-detect", "", None] else language
        sys.stderr.write(f"Transcribing '{video_path}' with language='{lang_arg or 'auto-detect'}'...\n")

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
                "id": str(segment.id),
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

        sys.stderr.write(f"Transcription complete: {len(segments_list)} segments, {len(words_flat)} words.\n")
        print(json.dumps(output, ensure_ascii=False))

    except Exception as e:
        err_msg = f"Transcription error: {str(e)}"
        sys.stderr.write(err_msg + "\n")
        print(json.dumps({
            "success": False,
            "error": err_msg
        }))
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transcribe video using faster-whisper")
    parser.add_argument("pos_video", nargs="?", default=None, help="Path to video file (positional)")
    parser.add_argument("pos_language", nargs="?", default=None, help="Language code (positional)")
    parser.add_argument("pos_model", nargs="?", default=None, help="Model size (positional)")

    parser.add_argument("--video", default=None, help="Path to video file")
    parser.add_argument("--language", default=None, help="Language code (e.g., en, sw, es, fr, auto)")
    parser.add_argument("--model", default="small", help="Whisper model size (tiny, base, small, medium, large-v3)")
    parser.add_argument("--device", default="cpu", help="Device to run on (cpu, cuda)")
    parser.add_argument("--compute_type", default="int8", help="Compute type (int8, float16, float32)")

    args = parser.parse_args()

    target_video = args.video or args.pos_video
    target_language = args.language or args.pos_language or "auto"
    target_model = args.pos_model or args.model or "small"

    if not target_video:
        err_msg = "Error: Video path not specified. Usage: python transcribe.py <path> [language] [model]"
        sys.stderr.write(err_msg + "\n")
        print(json.dumps({"success": False, "error": err_msg}))
        sys.exit(1)

    transcribe_video(target_video, target_language, target_model, args.compute_type, args.device)
