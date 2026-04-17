import requests
import base64

def test_post_api_dub_with_valid_file_and_target_language():
    url = "http://localhost:3001/api/dub"
    timeout = 30

    # Use a small valid media file content for testing (WAV header minimal)
    # To keep test self-contained, create an in-memory byte stream for a short silent WAV file.
    # WAV header for 1-second silent audio (PCM 16bit Mono 8000Hz)
    wav_data = (
        b"RIFF$\x00\x00\x00WAVEfmt "
        b"\x10\x00\x00\x00\x01\x00\x01\x00"
        b"\x40\x1f\x00\x00\x80>\x00\x00"
        b"\x02\x00\x10\x00data\x00\x00\x00\x00"
    )
    files = {
        "file": ("test.wav", wav_data, "audio/wav"),
    }
    data = {
        "target_language": "fr"
    }

    try:
        response = requests.post(url, files=files, data=data, timeout=timeout)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    try:
        json_data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert "srt" in json_data, "Response JSON missing 'srt' key"
    assert isinstance(json_data["srt"], str), "'srt' should be a string"
    assert len(json_data["srt"].strip()) > 0, "'srt' string is empty"

    assert "mp3" in json_data, "Response JSON missing 'mp3' key"
    assert isinstance(json_data["mp3"], str), "'mp3' should be a base64 string"

    # Validate that mp3 is valid base64 by decoding (not necessarily MP3 validation but catches invalid base64)
    try:
        mp3_bytes = base64.b64decode(json_data["mp3"], validate=True)
        assert len(mp3_bytes) > 0, "'mp3' base64 decoded data is empty"
    except Exception as e:
        assert False, f"'mp3' field is not valid base64: {e}"

test_post_api_dub_with_valid_file_and_target_language()