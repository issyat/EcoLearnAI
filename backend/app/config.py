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
    postgres_host: str = "db"
    postgres_port: int = 5432

    @property
    def database_url(self) -> str:
        return (
            "postgresql+asyncpg://"
            f"{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


def get_settings() -> Settings:
    return Settings()