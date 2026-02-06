"""인증(JWT) 단위 테스트"""
from unittest.mock import patch
from src.auth import create_access_token, create_refresh_token, verify_token


@patch("src.auth.settings")
def test_create_and_verify_access_token(mock_settings):
    mock_settings.jwt_secret_key = "test-secret-key-for-jwt-testing"
    mock_settings.jwt_algorithm = "HS256"
    mock_settings.access_token_expire_minutes = 30

    token = create_access_token(user_id=42)
    payload = verify_token(token, expected_type="access")

    assert payload is not None
    assert payload["sub"] == "42"
    assert payload["type"] == "access"


@patch("src.auth.settings")
def test_create_and_verify_refresh_token(mock_settings):
    mock_settings.jwt_secret_key = "test-secret-key-for-jwt-testing"
    mock_settings.jwt_algorithm = "HS256"
    mock_settings.refresh_token_expire_days = 7

    token = create_refresh_token(user_id=42)
    payload = verify_token(token, expected_type="refresh")

    assert payload is not None
    assert payload["sub"] == "42"
    assert payload["type"] == "refresh"


@patch("src.auth.settings")
def test_verify_invalid_token(mock_settings):
    mock_settings.jwt_secret_key = "test-secret-key-for-jwt-testing"
    mock_settings.jwt_algorithm = "HS256"

    payload = verify_token("invalid.jwt.token")
    assert payload is None


@patch("src.auth.settings")
def test_verify_wrong_type(mock_settings):
    mock_settings.jwt_secret_key = "test-secret-key-for-jwt-testing"
    mock_settings.jwt_algorithm = "HS256"
    mock_settings.access_token_expire_minutes = 30

    token = create_access_token(user_id=42)
    payload = verify_token(token, expected_type="refresh")
    assert payload is None
