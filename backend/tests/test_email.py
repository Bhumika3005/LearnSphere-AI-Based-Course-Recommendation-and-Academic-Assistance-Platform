from unittest.mock import MagicMock, patch
import pytest
import config
from utils.email import send_welcome_email


def test_send_welcome_email_missing_config():
    # Set config to empty to check warning behavior
    with patch("config.SMTP_HOST", None), \
         patch("config.SMTP_USERNAME", None), \
         patch("config.SMTP_PASSWORD", None):
        
        # Calling send_welcome_email should return False, and not throw
        result = send_welcome_email(
            name="Test User",
            email="test@example.com",
            temp_password="tempPassword123"
        )
        assert result is False


def test_send_welcome_email_success():
    # Set config to some mock values
    with patch("config.SMTP_HOST", "smtp.example.com"), \
         patch("config.SMTP_PORT", "587"), \
         patch("config.SMTP_USERNAME", "user@example.com"), \
         patch("config.SMTP_PASSWORD", "password"), \
         patch("config.SMTP_FROM", "sender@example.com"), \
         patch("smtplib.SMTP") as mock_smtp_class:
        
        mock_smtp_instance = MagicMock()
        mock_smtp_class.return_value = mock_smtp_instance
        
        result = send_welcome_email(
            name="Jane Doe",
            email="jane@example.com",
            temp_password="secretPassword"
        )
        
        assert result is True
        mock_smtp_class.assert_called_once_with("smtp.example.com", 587, timeout=10)
        mock_smtp_instance.ehlo.assert_called()
        mock_smtp_instance.starttls.assert_called_once()
        mock_smtp_instance.login.assert_called_once_with("user@example.com", "password")
        mock_smtp_instance.sendmail.assert_called_once()
        mock_smtp_instance.quit.assert_called_once()


def test_send_welcome_email_success_ssl_port_465():
    # Set config to SMTP_SSL port
    with patch("config.SMTP_HOST", "smtp.example.com"), \
         patch("config.SMTP_PORT", "465"), \
         patch("config.SMTP_USERNAME", "user@example.com"), \
         patch("config.SMTP_PASSWORD", "password"), \
         patch("config.SMTP_FROM", "sender@example.com"), \
         patch("smtplib.SMTP_SSL") as mock_smtp_ssl_class:
        
        mock_smtp_ssl_instance = MagicMock()
        mock_smtp_ssl_class.return_value = mock_smtp_ssl_instance
        
        result = send_welcome_email(
            name="Jane Doe",
            email="jane@example.com",
            temp_password="secretPassword"
        )
        
        assert result is True
        mock_smtp_ssl_class.assert_called_once_with("smtp.example.com", 465, timeout=10)
        mock_smtp_ssl_instance.login.assert_called_once_with("user@example.com", "password")
        mock_smtp_ssl_instance.sendmail.assert_called_once()
        mock_smtp_ssl_instance.quit.assert_called_once()


def test_send_welcome_email_smtp_failure_no_raise():
    # Set config to some mock values, but trigger an exception on login
    with patch("config.SMTP_HOST", "smtp.example.com"), \
         patch("config.SMTP_PORT", "587"), \
         patch("config.SMTP_USERNAME", "user@example.com"), \
         patch("config.SMTP_PASSWORD", "password"), \
         patch("config.SMTP_FROM", "sender@example.com"), \
         patch("smtplib.SMTP") as mock_smtp_class:
        
        mock_smtp_instance = MagicMock()
        mock_smtp_instance.login.side_effect = Exception("SMTP Auth Failed")
        mock_smtp_class.return_value = mock_smtp_instance
        
        # Should not raise exception, but return False (indicating failure)
        result = send_welcome_email(
            name="Jane Doe",
            email="jane@example.com",
            temp_password="secretPassword"
        )
        
        assert result is False


def test_smtp_from_fallback_to_sender():
    # Verify that if SMTP_FROM is not provided but SMTP_SENDER is, SMTP_FROM resolves to SMTP_SENDER
    with patch.dict("os.environ", {
        "SMTP_HOST": "smtp.example.com",
        "SMTP_PORT": "587",
        "SMTP_USERNAME": "user@example.com",
        "SMTP_PASSWORD": "password",
        "SMTP_SENDER": "sender-fallback@example.com"
    }, clear=True):
        # Reload variables from env as config.py does
        import importlib
        importlib.reload(config)
        
        assert config.SMTP_FROM == "sender-fallback@example.com"
        assert config.SMTP_SENDER == "sender-fallback@example.com"


def test_smtp_from_fallback_to_username():
    # Verify that if both SMTP_FROM and SMTP_SENDER are not provided, it falls back to SMTP_USERNAME
    with patch.dict("os.environ", {
        "SMTP_HOST": "smtp.example.com",
        "SMTP_PORT": "587",
        "SMTP_USERNAME": "user@example.com",
        "SMTP_PASSWORD": "password"
    }, clear=True):
        # Reload variables from env
        import importlib
        importlib.reload(config)
        
        assert config.SMTP_FROM == "user@example.com"
        assert config.SMTP_SENDER == "user@example.com"
