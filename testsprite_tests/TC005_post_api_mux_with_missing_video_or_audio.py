import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_post_api_mux_missing_video_or_audio():
    url = f"{BASE_URL}/api/mux"

    # Test case 1: Missing original_video file
    files = {
        # 'original_video' is intentionally missing
        'dubbed_audio': ('audio.mp3', b'test audio content', 'audio/mpeg')
    }
    try:
        response = requests.post(url, files=files, timeout=TIMEOUT)
        assert response.status_code == 400, f"Expected status code 400 but got {response.status_code}"
        assert response.text == "Missing video or audio file", f"Expected error message 'Missing video or audio file' but got {response.text}"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    # Test case 2: Missing dubbed_audio file
    files = {
        'original_video': ('video.mp4', b'test video content', 'video/mp4')
        # 'dubbed_audio' is intentionally missing
    }
    try:
        response = requests.post(url, files=files, timeout=TIMEOUT)
        assert response.status_code == 400, f"Expected status code 400 but got {response.status_code}"
        assert response.text == "Missing video or audio file", f"Expected error message 'Missing video or audio file' but got {response.text}"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    # Test case 3: Both files missing
    files = {
        # Both 'original_video' and 'dubbed_audio' missing
    }
    try:
        response = requests.post(url, files=files, timeout=TIMEOUT)
        assert response.status_code == 400, f"Expected status code 400 but got {response.status_code}"
        assert response.text == "Missing video or audio file", f"Expected error message 'Missing video or audio file' but got {response.text}"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_post_api_mux_missing_video_or_audio()