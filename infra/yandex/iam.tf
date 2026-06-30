# Least-privilege service accounts (do NOT run the PoC under the personal owner login).
# Verify grants later via Security Deck → Диагностика доступа.

# App SA: used by the VM/Supabase to reach Object Storage (signed URLs) and KMS.
resource "yandex_iam_service_account" "app" {
  name        = "blizko-poc-app"
  description = "Blizko PoC app: Object Storage + KMS (least privilege)"
}

resource "yandex_resourcemanager_folder_iam_member" "app_storage" {
  folder_id = var.folder_id
  role      = "storage.editor"
  member    = "serviceAccount:${yandex_iam_service_account.app.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "app_kms" {
  folder_id = var.folder_id
  role      = "kms.keys.encrypterDecrypter"
  member    = "serviceAccount:${yandex_iam_service_account.app.id}"
}

# Static access key for the app SA → S3-compatible Object Storage auth.
resource "yandex_iam_service_account_static_access_key" "app_s3" {
  service_account_id = yandex_iam_service_account.app.id
  description        = "S3 static key for Supabase Storage backend"
}

# VM SA: lets the instance pull its own metadata/operate; minimal.
resource "yandex_iam_service_account" "vm" {
  name        = "blizko-poc-vm"
  description = "Blizko PoC compute instance SA"
}

resource "yandex_resourcemanager_folder_iam_member" "vm_images" {
  folder_id = var.folder_id
  role      = "compute.viewer"
  member    = "serviceAccount:${yandex_iam_service_account.vm.id}"
}
