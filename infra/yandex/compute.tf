data "yandex_compute_image" "ubuntu" {
  family = var.vm_image_family
}

resource "yandex_compute_instance" "supabase" {
  name        = "blizko-poc-supabase"
  platform_id = "standard-v3"
  zone        = var.zone

  service_account_id = yandex_iam_service_account.vm.id

  resources {
    cores         = var.vm_cores
    core_fraction = var.vm_core_fraction
    memory        = var.vm_memory_gb
  }

  boot_disk {
    initialize_params {
      image_id = data.yandex_compute_image.ubuntu.id
      size     = var.vm_disk_gb
      type     = "network-ssd"
    }
  }

  network_interface {
    subnet_id          = yandex_vpc_subnet.poc.id
    security_group_ids = [yandex_vpc_security_group.poc.id]
    nat                = true # public IP for the RU-endpoint smoke; remove for prod
  }

  metadata = {
    ssh-keys  = "ubuntu:${file(var.ssh_public_key_file)}"
    user-data = file("${path.module}/cloud-init.yaml")
  }

  # PoC convenience; keep on so a mistake doesn't strand the box.
  scheduling_policy {
    preemptible = false
  }
}
