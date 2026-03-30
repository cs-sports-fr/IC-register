import os
import boto3  # type: ignore

from dotenv import load_dotenv

load_dotenv(".env")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
AWS_REGION = "eu-west-3"


class fileStorageClient:
    def __init__(self):
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_KEY,
            region_name=AWS_REGION,
        )

    def upload_file(self, file_name, bucket, object_name=None):
        if object_name is None:
            object_name = file_name

        self.s3_client.upload_file(file_name, bucket, object_name)

    def download_file(self, bucket, object_name, local_file_name):

        self.s3_client.download_file(bucket, object_name, local_file_name)
