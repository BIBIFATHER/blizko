resource "yandex_vpc_network" "poc" {
  name = "blizko-poc-net"
}

resource "yandex_vpc_subnet" "poc" {
  name           = "blizko-poc-subnet"
  zone           = var.zone
  network_id     = yandex_vpc_network.poc.id
  v4_cidr_blocks = ["10.10.0.0/24"]
}

# Minimal perimeter (PoC T11). SSH locked to a narrow CIDR; HTTPS open for the
# RU endpoint smoke; egress open. Tighten further before any real data.
resource "yandex_vpc_security_group" "poc" {
  name       = "blizko-poc-sg"
  network_id = yandex_vpc_network.poc.id

  ingress {
    protocol       = "TCP"
    description    = "SSH (locked to operator CIDR)"
    v4_cidr_blocks = [var.allowed_ssh_cidr]
    port           = 22
  }

  ingress {
    protocol       = "TCP"
    description    = "HTTPS (Supabase/Kong RU endpoint)"
    v4_cidr_blocks = ["0.0.0.0/0"]
    port           = 443
  }

  egress {
    protocol       = "ANY"
    description    = "All egress (package install, image pull)"
    v4_cidr_blocks = ["0.0.0.0/0"]
  }
}
