import os
import shutil
from shared.providers.base import StorageProvider

class S3StorageProvider(StorageProvider):
    def __init__(self):
        self.access_key = os.getenv("SUPABASE_S3_ACCESS_KEY_ID")
        self.secret_key = os.getenv("SUPABASE_S3_SECRET_ACCESS_KEY")
        self.endpoint = os.getenv("SUPABASE_S3_ENDPOINT")
        self.region = os.getenv("SUPABASE_S3_REGION", "ap-south-1")
        self.default_bucket = os.getenv("STORAGE_BUCKET_NAME", "ScrapCTL")

    def upload_file(self, local_path: str, remote_path: str, bucket_name: str = None) -> bool:
        import boto3
        
        bucket = bucket_name or self.default_bucket
        if not all([self.access_key, self.secret_key, self.endpoint]):
            print("[Storage-S3] Error: Missing S3 credentials in environment.")
            return False
            
        file_name = os.path.basename(local_path)
        try:
            s3_client = boto3.client(
                "s3",
                endpoint_url=self.endpoint,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region,
            )
            s3_client.upload_file(local_path, bucket, remote_path)
            print(f"[Storage-S3] Successfully uploaded {file_name} to bucket '{bucket}' path '{remote_path}'")
            return True
        except Exception as e:
            print(f"[Storage-S3] Upload failed for {file_name}: {e}")
            return False

class LocalStorageProvider(StorageProvider):
    def __init__(self):
        # Store files in Backend/output/storage/ relative to execution
        self.storage_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "output", "storage"))
        self.default_bucket = os.getenv("STORAGE_BUCKET_NAME", "ScrapCTL")

    def upload_file(self, local_path: str, remote_path: str, bucket_name: str = None) -> bool:
        bucket = bucket_name or self.default_bucket
        file_name = os.path.basename(local_path)
        
        # Target path: Backend/output/storage/{bucket}/{remote_path}
        dest_path = os.path.join(self.storage_dir, bucket, remote_path)
        try:
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            shutil.copy2(local_path, dest_path)
            print(f"[Storage-Local] Successfully saved {file_name} to local path: {dest_path}")
            return True
        except Exception as e:
            print(f"[Storage-Local] Failed to save {file_name} locally: {e}")
            return False

class DatabaseStorageProvider(StorageProvider):
    def __init__(self):
        self.default_bucket = os.getenv("STORAGE_BUCKET_NAME", "ScrapCTL")

    def upload_file(self, local_path: str, remote_path: str, bucket_name: str = None) -> bool:
        # Import dynamically to avoid circular import issues
        from shared.providers.factory import get_db_provider
        from shared.models import ScrapFile
        
        bucket = bucket_name or self.default_bucket
        file_name = os.path.basename(local_path)
        
        # We parse the session_id from the remote path (it is formatted as session_id/filename)
        session_id = "UNKNOWN"
        parts = remote_path.split("/")
        if len(parts) > 1:
            session_id = parts[0]
            
        try:
            with open(local_path, "rb") as f:
                content_bytes = f.read()
                
            db = get_db_provider()
            with db.get_session() as session:
                # Store file as binary attachment in database
                db_file = ScrapFile(
                    session_id=session_id,
                    filename=file_name,
                    content=content_bytes
                )
                session.add(db_file)
                session.commit()
                
            print(f"[Storage-DB] Successfully saved {file_name} to Database ScrapFile table.")
            return True
        except Exception as e:
            print(f"[Storage-DB] Failed to save {file_name} to Database: {e}")
            return False


class VercelBlobStorageProvider(StorageProvider):
    def __init__(self):
        # Support both standard token and user's custom environment variable name
        self.token = os.getenv("BLOB_READ_WRITE_TOKEN") or os.getenv("scraptctl_READ_WRITE_TOKEN")
        if not self.token:
            # Check for typo / variations
            self.token = os.getenv("scraptctl_READ_WRITE_TOKEN")

    def upload_file(self, local_path: str, remote_path: str, bucket_name: str = None) -> bool:
        import requests
        
        if not self.token:
            print("[Storage-Vercel] Error: Missing BLOB_READ_WRITE_TOKEN or scraptctl_READ_WRITE_TOKEN in .env")
            return False
            
        file_name = os.path.basename(local_path)
        # Endpoint URL format for Vercel Blob
        url = f"https://blob.vercel-storage.com/{remote_path}"
        
        # Determine content type
        content_type = "application/octet-stream"
        if file_name.endswith(".json"):
            content_type = "application/json"
        elif file_name.endswith(".csv"):
            content_type = "text/csv"
            
        try:
            with open(local_path, "rb") as f:
                headers = {
                    "authorization": f"Bearer {self.token}",
                    "x-api-version": "7",
                    "x-content-type": content_type,
                    "x-add-random-suffix": "0",  # Preserve exact name
                    "x-allow-overwrite": "1",
                    "access": "public",          # Default to public access
                    "x-access": "public"
                }
                response = requests.put(url, data=f, headers=headers)
                
            # Self-healing retry: If store is private, retry with private access
            if response.status_code == 400 and "private" in response.text.lower():
                print("[Storage-Vercel] Store is private. Retrying upload with private access...")
                with open(local_path, "rb") as f:
                    headers["access"] = "private"
                    headers["x-access"] = "private"
                    response = requests.put(url, data=f, headers=headers)
                
            if response.status_code in [200, 201]:
                res_data = response.json()
                download_url = res_data.get("url")
                print(f"[Storage-Vercel] Successfully uploaded {file_name} to Vercel Blob: {download_url}")
                return True
            else:
                print(f"[Storage-Vercel] Upload failed with status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            print(f"[Storage-Vercel] Upload failed for {file_name}: {e}")
            return False

