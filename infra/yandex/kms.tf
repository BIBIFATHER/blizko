# KMS key for at-rest encryption of Object Storage objects and PoC secrets (T12).
resource "yandex_kms_symmetric_key" "poc" {
  name              = "blizko-poc-key"
  default_algorithm = "AES_256"
  rotation_period   = "8760h" # 1 year
}
