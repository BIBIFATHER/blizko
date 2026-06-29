variable "sa_key_file" {
  description = "Path to the YC service-account key JSON (authorized key) used by Terraform. Keep OUT of git."
  type        = string
  default     = "sa-key.json"
}

variable "cloud_id" {
  description = "YC cloud id (parent of the folder). Get with: yc resource-manager cloud list"
  type        = string
}

variable "folder_id" {
  description = "YC folder id. Current console folder: b1g90oug1ndeq5i08hqq"
  type        = string
  default     = "b1g90oug1ndeq5i08hqq"
}

variable "zone" {
  description = "YC availability zone (RU region — 152-FZ Art.18.5)"
  type        = string
  default     = "ru-central1-a"
}

# --- Compute sizing (grant-budget conscious; verify against the YC calculator) ---
variable "vm_cores" {
  description = "vCPU count for the PoC VM"
  type        = number
  default     = 2
}

variable "vm_core_fraction" {
  description = "Guaranteed vCPU share (20 = burstable b-class, cheapest; raise if Supabase is CPU-starved)"
  type        = number
  default     = 20
}

variable "vm_memory_gb" {
  description = "RAM (GB). Supabase self-host stack (~10 containers) needs ~6-8GB to be comfortable."
  type        = number
  default     = 8
}

variable "vm_disk_gb" {
  description = "Boot/data SSD size (GB)"
  type        = number
  default     = 30
}

variable "vm_image_family" {
  description = "VM image family (Ubuntu LTS with cloud-init)"
  type        = string
  default     = "ubuntu-2404-lts"
}

variable "ssh_public_key_file" {
  description = "Path to your SSH public key for VM access (T11: key-based access only)"
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}

variable "allowed_ssh_cidr" {
  description = "CIDR allowed to SSH (lock to your IP/32 for the PoC; do NOT leave 0.0.0.0/0)"
  type        = string
  # No default on purpose — force an explicit, narrow value.
}

variable "bucket_name" {
  description = "Object Storage bucket name (globally unique). Private; synthetic data only."
  type        = string
  default     = "blizko-poc-synthetic"
}
