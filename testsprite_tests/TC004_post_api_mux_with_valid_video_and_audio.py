import requests
import base64

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_post_api_mux_with_valid_video_and_audio():
    # Step 1: Upload a video and get dubbed audio using /api/dub to have valid files
    dub_url = f"{BASE_URL}/api/dub"
    mux_url = f"{BASE_URL}/api/mux"

    # Use a small sample video file and dummy target language
    # For the test, we'll generate minimal binary content typical for video and audio.
    # However, since we have no real binary files, use minimal bytes and expect the backend to accept or handle it.
    # This is a demonstration, in real environment, use real media files.

    sample_video_content = b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42mp41'  # minimal mp4 header bytes
    sample_audio_content = b'RIFF$\x00\x00\x00WAVEfmt '  # minimal wav header bytes

    # Upload video to /api/dub to generate dubbed audio mp3 base64
    try:
        files = {
            'file': ('sample.mp4', sample_video_content, 'video/mp4')
        }
        data = {
            'target_language': 'en'
        }
        dub_resp = requests.post(dub_url, files=files, data=data, timeout=TIMEOUT)
        assert dub_resp.status_code == 200, f"Expected 200 from /api/dub but got {dub_resp.status_code}"
        dub_json = dub_resp.json()
        assert 'mp3' in dub_json and 'srt' in dub_json, "Response missing 'mp3' or 'srt' fields"
        
        mp3_base64 = dub_json['mp3']
        mp3_binary = base64.b64decode(mp3_base64)
        
        # Now POST to /api/mux with original_video and dubbed_audio
        files_mux = {
            'original_video': ('sample.mp4', sample_video_content, 'video/mp4'),
            'dubbed_audio': ('dubbed.mp3', mp3_binary, 'audio/mpeg'),
        }
        mux_resp = requests.post(mux_url, files=files_mux, timeout=TIMEOUT)

        assert mux_resp.status_code == 200, f"Expected 200 from /api/mux but got {mux_resp.status_code}"
        content_type = mux_resp.headers.get('Content-Type', '')
        assert "video/mp4" in content_type, f"Expected Content-Type to include 'video/mp4' but got '{content_type}'"
        assert mux_resp.content is not None and len(mux_resp.content) > 0, "Empty response content for muxed video"
        
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_post_api_mux_with_valid_video_and_audio()