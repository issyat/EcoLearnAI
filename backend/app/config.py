from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    project_name: str = "EcoLearnAI API"
    api_v1_prefix: str = "/api/v1"
    environment: str = "local"

    # Database
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_db: str = "ecolearnai"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    # JWT
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # GPT API
    gpt_api_key: str = ""
    gpt_api_url: str = "https://api.dat1.co/api/v1/collection/gpt-120-oss/invoke-chat"

    @property
    def database_url(self) -> str:
        return (
            "postgresql+asyncpg://"
            f"{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


def get_settings() -> Settings:
    return Settings()