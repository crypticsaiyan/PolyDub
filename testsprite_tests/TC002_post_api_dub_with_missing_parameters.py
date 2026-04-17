import requests

BASE_URL = "http://localhost:3001"

def test_post_api_dub_missing_parameters():
    url = f"{BASE_URL}/api/dub"
    timeout = 30

    # Case 1: Missing file, provide target_language only
    data_missing_file = {'target_language': 'fr'}
    response = requests.post(url, data=data_missing_file, timeout=timeout)
    assert response.status_code == 400, f"Expected 400 but got {response.status_code}"
    assert response.text == "Missing parameters", f"Expected 'Missing parameters' but got {response.text}"

    # Case 2: Missing target_language, provide file only
    # Use a small dummy file content to simulate upload (empty content)
    files_missing_target = {'file': ('dummy.mp4', b'', 'video/mp4')}
    response = requests.post(url, files=files_missing_target, timeout=timeout)
    assert response.status_code == 400, f"Expected 400 but got {response.status_code}"
    assert response.text == "Missing parameters", f"Expected 'Missing parameters' but got {response.text}"

    # Case 3: Missing both file and target_language (empty request)
    response = requests.post(url, timeout=timeout)
    assert response.status_code == 400, f"Expected 400 but got {response.status_code}"
    assert response.text == "Missing parameters", f"Expected 'Missing parameters' but got {response.text}"

test_post_api_dub_missing_parameters()