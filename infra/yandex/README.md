# Blizko RU PoC — Yandex Cloud (Terraform)

Synthetic-only RU data-plane PoC on the **10,000 ₽ / 2-month grant**.
Plan: [`docs/architecture/ru-core-yandex-cloud-poc.md`](../../docs/architecture/ru-core-yandex-cloud-poc.md) · Linear **BLI-135**.

**Scope:** single VM self-host Supabase + Object Storage + KMS + least-privilege
SAs, in the RU region. **No real personal data. No production.** `terraform
destroy` for clean teardown before the grant window ends.

## Known account facts (audited 2026-06-30)

- Grant **10,000 ₽ intact** on billing **account-447** (`dn2sv6l4ctufvhuaf52p`, Trial active).
- account-110 (`dn2ohxvhoeexcodfyme5`) = paid (МИР card) — do NOT bill the PoC here.
- Cloud `cloud-anton-anosovv`, folder `b1g90oug1ndeq5i08hqq`. **No cloud is bound
  to either billing account yet** → bind to **account-447** before creating resources.
- Org has 1 user (Yandex ID), no service accounts/groups yet.

## Manual prerequisites (owner, in console — money/identity, not in Terraform)

1. **Bind the cloud to the grant.** Billing → account-447 → «Привязать» → select
   `cloud-anton-anosovv`. This makes all PoC resources draw from the 10k grant, not the card.
2. **Budget alert.** Billing → account-447 → Бюджеты → create a 10,000 ₽ threshold alert.
3. **MFA** on the owner Yandex ID.
4. **Confirm trial allows** Compute / Object Storage / KMS (trials sometimes restrict services).

## Terraform prerequisites

3. **Create the Terraform service account + key** (one-time), e.g. via `yc` CLI:
   ```sh
   yc iam service-account create --name blizko-poc-tf
   # grant it editor on the folder (PoC scope)
   yc resource-manager folder add-access-binding b1g90oug1ndeq5i08hqq \
     --role editor --subject serviceAccount:<TF_SA_ID>
   # authorized key → sa-key.json (gitignored)
   yc iam key create --service-account-id <TF_SA_ID> --output infra/yandex/sa-key.json
   ```
   Get `cloud_id`: `yc resource-manager cloud list`.

4. `cp terraform.tfvars.example terraform.tfvars` and fill `cloud_id`,
   `allowed_ssh_cidr` (your IP/32), key paths.

## Run

```sh
cd infra/yandex
terraform init
terraform plan        # review every resource + cost before applying
terraform apply       # creates: VPC, SG, VM (cloud-init Supabase), bucket, KMS, SAs
```

After apply:

```sh
ssh ubuntu@$(terraform output -raw vm_external_ip)
# configure /opt/supabase-docker/.env (strong POSTGRES_PASSWORD, JWT_SECRET,
# ANON/SERVICE keys, SMSAero hook, S3 backend = bucket + app S3 keys), then:
cd /opt/supabase-docker && docker compose up -d
```

S3 backend creds for Supabase Storage:

```sh
terraform output -raw app_s3_access_key
terraform output -raw app_s3_secret_key   # bucket = terraform output bucket_name
```

## Teardown (before grant ends — cost control)

```sh
terraform destroy
```

Then capture the Evidence Pack (`.context/EVIDENCE_PACK_TEMPLATE.md`) for T0–T16 BEFORE destroy.

## Caveats

- **PG version:** upstream supabase/docker ships PG 15; prod is **17.6**. Fine for
  stack-compat PoC, but the EU→RU dump test (T9) needs PG 17 (custom image or YC
  Managed PostgreSQL 17.x). Decide before T6/T9.
- Single VM, NAT public IP, no HA — PoC only. Prod needs HA + tighter perimeter +
  ФСТЭК/high-УЗ segment for special categories (children/documents).
- `acl=private` + KMS SSE + signed-URL-only access. Never make the bucket public.
- This bootstrap is convenience-grade; harden secrets/JWT/logs per T11–T16 before any real data.
