from abc import ABC, abstractmethod
from typing import Any

class DatabaseProvider(ABC):
    @abstractmethod
    def create_all_tables(self) -> None:
        """Create tables if they do not exist."""
        pass

    @abstractmethod
    def get_session(self) -> Any:
        """Returns a context manager session or database connection."""
        pass

class StorageProvider(ABC):
    @abstractmethod
    def upload_file(self, local_path: str, remote_path: str, bucket_name: str = None) -> bool:
        """Uploads a local file to the storage provider.
        
        Args:
            local_path: Path to the file on local disk.
            remote_path: Target relative path in storage (e.g. session_id/file.csv).
            bucket_name: Optional bucket name, falls back to env settings if None.
        
        Returns:
            True if upload succeeded, False otherwise.
        """
        pass
