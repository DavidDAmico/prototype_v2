#!/usr/bin/env python3
import requests

def main():
    session = requests.Session()
    base_url = "http://localhost:5001"  # Passe diesen Wert ggf. an

    # Optionaler initialer Request (falls dein Backend beim ersten Aufruf Cookies, z. B. für CSRF, setzt)
    init_url = f"{base_url}/"
    print("Fetching initial URL:", init_url)
    init_response = session.get(init_url)
    print("Initial response status code:", init_response.status_code)
    
    # Versuche, den CSRF-Token aus den Cookies auszulesen (falls verwendet)
    csrf_token = session.cookies.get("csrf_access_token")
    print("CSRF Token from cookie:", csrf_token)
    
    # Login-Request – genauso wie in deiner Login-Page
    login_url = f"{base_url}/auth/login"
    payload = {
        "username": "master",
        "password": "master"
    }
    headers = {
        "Content-Type": "application/json"
    }
    if csrf_token:
        headers["X-CSRF-TOKEN"] = csrf_token

    print("Sending login request to:", login_url)
    login_response = session.post(login_url, json=payload, headers=headers)
    print("Login response status code:", login_response.status_code)
    print("Login response body:", login_response.text)
    print("Cookies after login:", session.cookies.get_dict())

    if not login_response.ok:
        print("Login failed – exiting test.")
        return

    # Zugriff auf einen geschützten Endpunkt
    protected_url = f"{base_url}/auth/protected"
    print("Fetching protected endpoint:", protected_url)
    # WICHTIG: Hier keine zusätzlichen Header übergeben – die Session sendet die gespeicherten Cookies automatisch!
    protected_response = session.get(protected_url)
    print("Protected endpoint response status code:", protected_response.status_code)
    print("Protected endpoint body:", protected_response.text)

if __name__ == "__main__":
    main()
