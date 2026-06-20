import os
from shared.providers.base import DatabaseProvider, StorageProvider
from shared.providers.db_provider import SQLModelDatabaseProvider
from shared.providers.storage_provider import S3StorageProvider, LocalStorageProvider, DatabaseStorageProvider, VercelBlobStorageProvider

# Singletons cached in module scope
_db_provider_instance = None
_storage_provider_instance = None

def get_db_provider() -> DatabaseProvider:
    global _db_provider_instance
    if _db_provider_instance is None:
        db_type = os.getenv("DB_PROVIDER", "sqlite").lower()
        if db_type == "postgres" or db_type == "postgresql":
            # Uses the same SQLModel provider, it parses DATABASE_URL from .env
            _db_provider_instance = SQLModelDatabaseProvider()
        else:
            # Default to SQLite SQLModel provider
            _db_provider_instance = SQLModelDatabaseProvider()
            
    return _db_provider_instance

def get_storage_provider() -> StorageProvider:
    global _storage_provider_instance
    if _storage_provider_instance is None:
        storage_type = os.getenv("STORAGE_PROVIDER", "local").lower()
        if storage_type == "s3":
            _storage_provider_instance = S3StorageProvider()
        elif storage_type == "db" or storage_type == "database":
            _storage_provider_instance = DatabaseStorageProvider()
        elif storage_type == "vercel":
            _storage_provider_instance = VercelBlobStorageProvider()
        else:
            # Default to Local disk storage (Backend/output/storage/)
            _storage_provider_instance = LocalStorageProvider()
            
    return _storage_provider_instance
