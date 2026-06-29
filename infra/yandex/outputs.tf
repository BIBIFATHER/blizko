output "vm_external_ip" {
  description = "Public IP of the PoC VM (SSH + RU endpoint smoke)"
  value       = yandex_compute_instance.supabase.network_interface.0.nat_ip_address
}

output "vm_internal_ip" {
  value = yandex_compute_instance.supabase.network_interface.0.ip_address
}

output "bucket_name" {
  value = yandex_storage_bucket.poc.bucket
}

output "kms_key_id" {
  value = yandex_kms_symmetric_key.poc.id
}

output "app_sa_id" {
  value = yandex_iam_service_account.app.id
}

# S3 static key for the Supabase Storage backend — sensitive.
output "app_s3_access_key" {
  value     = yandex_iam_service_account_static_access_key.app_s3.access_key
  sensitive = true
}

output "app_s3_secret_key" {
  value     = yandex_iam_service_account_static_access_key.app_s3.secret_key
  sensitive = true
}
