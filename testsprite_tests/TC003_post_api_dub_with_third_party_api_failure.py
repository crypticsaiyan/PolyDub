import requests

def test_post_api_dub_with_third_party_api_failure():
    url = "http://localhost:3001/api/dub"
    files = {
        "file": ("test_audio.mp3", b"FakeAudioContent", "audio/mpeg"),
    }
    data = {
        "target_language": "es"
    }

    try:
        response = requests.post(url, files=files, data=data, timeout=30)
        assert response.status_code == 500, f"Expected status code 500 but got {response.status_code}"
        content_type = response.headers.get("Content-Type", "")
        assert "application/json" in content_type or "text/plain" in content_type or "application/problem+json" in content_type or "text/html" not in content_type, f"Unexpected Content-Type: {content_type}"
        # The error message should indicate missing API keys or processing error
        # Allow for message in JSON or text response
        try:
            resp_json = response.json()
            error_msg = str(resp_json.get("error") or resp_json.get("message") or "")
            assert "processing error" in error_msg.lower() or "missing api key" in error_msg.lower() or "error" in error_msg.lower()
        except Exception:
            # fallback to raw text
            text = response.text.lower()
            assert "processing error" in text or "missing api key" in text or "error" in text
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_post_api_dub_with_third_party_api_failure()