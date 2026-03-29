from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/rise_match"
    redis_url: str = "redis://localhost:6379"
    college_scorecard_api_key: str = "iqOCkqTKGZnG3RTGkhwVEgHCDYXQceYLC2Xsybl8"
    resend_api_key: str = ""
    supabase_url: str = ""
    supabase_service_key: str = ""
    jwt_secret: str = "changeme-in-production"
    cors_origins: str = "http://localhost:3000,https://app.riseathletics.fr"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
