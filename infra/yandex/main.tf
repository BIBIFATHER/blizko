# Blizko RU data-plane PoC — Yandex Cloud (synthetic-only).
# See docs/architecture/ru-core-yandex-cloud-poc.md and Linear BLI-135.
#
# SCOPE: synthetic PoC on the 10,000 ₽ / 2-month grant (account-447,
# id dn2sv6l4ctufvhuaf52p). NO real personal data, NO production.
# Single VM self-host Supabase. `terraform destroy` for clean teardown
# before the grant window ends.

terraform {
  required_version = ">= 1.6"
  required_providers {
    yandex = {
      source  = "yandex-cloud/yandex"
      version = "~> 0.120"
    }
  }
  # Local state for the PoC. Do NOT commit terraform.tfstate (see .gitignore) —
  # it can contain secrets. For longer-lived use, move to a YC Object Storage backend.
}

provider "yandex" {
  # Auth via a service-account key file (recommended) — see README.
  service_account_key_file = var.sa_key_file
  cloud_id                 = var.cloud_id
  folder_id                = var.folder_id
  zone                     = var.zone
}
