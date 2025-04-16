import json
from urllib.parse import urlencode
from fastapi import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from jwt import encode as create_access_token
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
import requests
import os
from dotenv import load_dotenv
from app.services.utils import get_user_by_email
from app.database.data import supabase

load_dotenv()

router = APIRouter(prefix="/auth", tags=["Google Auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI_LOCAL = os.getenv("GOOGLE_REDIRECT_URI")
REDIRECT_URI_PROD = os.getenv("GOOGLE_REDIRECT_URI_PROD")
ENVIRONMENT = os.getenv("ENVIRONMENT", "production")

if ENVIRONMENT == "local":
    REDIRECT_URI = REDIRECT_URI_LOCAL
else:
    REDIRECT_URI = REDIRECT_URI_PROD

FRONTEND_URL_LOCAL = os.getenv("FRONTEND_URL")
FRONTEND_URL_PROD = os.getenv("FRONTEND_URL_PROD")

if ENVIRONMENT == "local":
    FINAL_FRONTEND_URL = FRONTEND_URL_LOCAL
else:
    FINAL_FRONTEND_URL = FRONTEND_URL_PROD

SCOPES = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email"

@router.get("/google")
async def google_auth():
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "offline",
        "prompt": "consent",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return RedirectResponse(url)

@router.get("/callback/google")
async def google_callback(code: str):
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code"
    }

    r = requests.post(token_url, data=data)
    if not r.ok:
        raise HTTPException(status_code=400, detail="Error al obtener el token de Google")

    tokens = r.json()
    google_access_token = tokens["access_token"]

    userinfo = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {google_access_token}"}
    )
    if not userinfo.ok:
        raise HTTPException(status_code=400, detail="Error al obtener la información del usuario")

    user_data = userinfo.json()
    email = user_data["email"]

    user = get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail="Este usuario no está autorizado a iniciar sesión.")

    supabase.table("users").update({"google_access_token": google_access_token}).eq("id", user["id"]).execute()

    jwt_token = create_access_token(data={"sub": user["id"], "role": user["role"]})

    # Create user data object
    user_data = {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"]
    }

    # Encode user data for URL
    encoded_user_data = urlencode({"user": json.dumps(user_data)})

    redirect_url = (
        f"{FINAL_FRONTEND_URL}/login"  # Redirect to login page
        f"?token={jwt_token}"
        f"&{encoded_user_data}"  # Add encoded user data
    )

    return RedirectResponse(url=redirect_url)

# ... existing code ... 