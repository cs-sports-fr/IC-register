from typing import Dict, Any
import requests  # type: ignore
import os


class MailgunClient:
    def __init__(self) -> None:
        self.domain = os.getenv("MAILGUN_DOMAIN")
        self.api_key = os.getenv("MAILGUN_API_KEY")
        self.base_url = f"https://api.mailgun.net/v3/{self.domain}/messages"

    def send_email(
        self,
        from_email: str,
        to_email: str,
        subject: str,
        text: str,
        html: str,
    ) -> Dict[str, Any]:

        return requests.post(
            self.base_url,
            auth=("api", self.api_key),
            data={
                "from": from_email,
                "to": to_email,
                "subject": subject,
                "text": text,
                "html": html,
            },
        ).json()
