# Private Object Storage bucket (S3-compatible) for synthetic documents/photos.
# Server-side encryption with the KMS key (T12). Private ACL; access via
# server-issued signed URLs only (T3/T14) — never public.
resource "yandex_storage_bucket" "poc" {
  bucket     = var.bucket_name
  access_key = yandex_iam_service_account_static_access_key.app_s3.access_key
  secret_key = yandex_iam_service_account_static_access_key.app_s3.secret_key

  # Private — no public read/list.
  acl = "private"

  anonymous_access_flags {
    read        = false
    list        = false
    config_read = false
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = yandex_kms_symmetric_key.poc.id
        sse_algorithm     = "aws:kms"
      }
    }
  }
}
