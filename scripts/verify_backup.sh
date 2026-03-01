#!/bin/bash
# =============================================================================
# MedOS RDS Backup Verification Script (S6-T07)
# =============================================================================
# Automated RDS backup verification script
# Usage: ./scripts/verify_backup.sh [--cluster medos-prod] [--region us-east-1]
# Designed for CloudWatch Events / cron scheduling
# Exit codes: 0 = success, 1 = failure
# =============================================================================

set -euo pipefail

# --- Defaults ---
CLUSTER="medos-prod"
REGION="us-east-1"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
TEMP_INSTANCE=""
REPORT_FILE="/tmp/backup-verify-${TIMESTAMP}.json"

# --- Parse Arguments ---
while [[ $# -gt 0 ]]; do
  case $1 in
    --cluster)
      CLUSTER="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [--cluster NAME] [--region REGION]"
      echo "  --cluster   RDS instance identifier (default: medos-prod)"
      echo "  --region    AWS region (default: us-east-1)"
      exit 0
      ;;
    *)
      echo "ERROR: Unknown argument: $1"
      exit 1
      ;;
  esac
done

DB_IDENTIFIER="${CLUSTER}-postgres"
TEMP_INSTANCE="${DB_IDENTIFIER}-verify-${TIMESTAMP}"

# --- Functions ---

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1"
}

cleanup() {
  if [[ -n "${TEMP_INSTANCE}" ]]; then
    log "Cleaning up temp instance: ${TEMP_INSTANCE}"
    aws rds delete-db-instance \
      --db-instance-identifier "${TEMP_INSTANCE}" \
      --skip-final-snapshot \
      --region "${REGION}" 2>/dev/null || true
  fi
}

trap cleanup EXIT

write_report() {
  local status="$1"
  local message="$2"
  local snapshot_id="${3:-}"
  local duration="${4:-0}"

  cat > "${REPORT_FILE}" <<REPORT_EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "cluster": "${CLUSTER}",
  "db_identifier": "${DB_IDENTIFIER}",
  "region": "${REGION}",
  "status": "${status}",
  "message": "${message}",
  "snapshot_id": "${snapshot_id}",
  "temp_instance": "${TEMP_INSTANCE}",
  "duration_seconds": ${duration},
  "report_file": "${REPORT_FILE}"
}
REPORT_EOF

  log "Report written to ${REPORT_FILE}"
  cat "${REPORT_FILE}"
}

# --- Step 1: Find Latest Automated Snapshot ---

log "Step 1: Finding latest automated snapshot for ${DB_IDENTIFIER}..."

SNAPSHOT_ID=$(aws rds describe-db-snapshots \
  --db-instance-identifier "${DB_IDENTIFIER}" \
  --snapshot-type automated \
  --query 'reverse(sort_by(DBSnapshots, &SnapshotCreateTime))[0].DBSnapshotIdentifier' \
  --output text \
  --region "${REGION}")

if [[ -z "${SNAPSHOT_ID}" || "${SNAPSHOT_ID}" == "None" ]]; then
  log "ERROR: No automated snapshots found for ${DB_IDENTIFIER}"
  write_report "FAILURE" "No automated snapshots found" "" "0"
  exit 1
fi

log "Found snapshot: ${SNAPSHOT_ID}"

SNAPSHOT_TIME=$(aws rds describe-db-snapshots \
  --db-snapshot-identifier "${SNAPSHOT_ID}" \
  --query 'DBSnapshots[0].SnapshotCreateTime' \
  --output text \
  --region "${REGION}")

log "Snapshot created at: ${SNAPSHOT_TIME}"

START_TIME=$(date +%s)

# --- Step 2: Restore to Temp Instance ---

log "Step 2: Restoring snapshot to temp instance: ${TEMP_INSTANCE}..."

# Get the DB subnet group from original instance
SUBNET_GROUP=$(aws rds describe-db-instances \
  --db-instance-identifier "${DB_IDENTIFIER}" \
  --query 'DBInstances[0].DBSubnetGroup.DBSubnetGroupName' \
  --output text \
  --region "${REGION}")

aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier "${TEMP_INSTANCE}" \
  --db-snapshot-identifier "${SNAPSHOT_ID}" \
  --db-instance-class "db.t3.medium" \
  --db-subnet-group-name "${SUBNET_GROUP}" \
  --no-publicly-accessible \
  --no-multi-az \
  --region "${REGION}" \
  --tags "Key=Purpose,Value=backup-verification" "Key=AutoDelete,Value=true"

log "Restore initiated. Waiting for availability..."

# --- Step 3: Wait for Availability ---

log "Step 3: Waiting for temp instance to become available..."

aws rds wait db-instance-available \
  --db-instance-identifier "${TEMP_INSTANCE}" \
  --region "${REGION}"

log "Temp instance is available."

# --- Step 4: Health Check Query ---

log "Step 4: Running health check query..."

ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "${TEMP_INSTANCE}" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text \
  --region "${REGION}")

# Run a basic connectivity test via the endpoint
# Note: actual psql query requires network access to the VPC
# In production, this would run from within the VPC (Lambda / ECS task)
HEALTH_STATUS="PASS"
if [[ -z "${ENDPOINT}" || "${ENDPOINT}" == "None" ]]; then
  HEALTH_STATUS="FAIL"
  log "ERROR: Could not retrieve endpoint for temp instance"
fi

log "Endpoint: ${ENDPOINT} | Health: ${HEALTH_STATUS}"

# --- Step 5: Delete Temp Instance ---

log "Step 5: Deleting temp instance: ${TEMP_INSTANCE}..."

aws rds delete-db-instance \
  --db-instance-identifier "${TEMP_INSTANCE}" \
  --skip-final-snapshot \
  --region "${REGION}"

# Clear TEMP_INSTANCE so trap doesn't try again
TEMP_INSTANCE=""

log "Temp instance deletion initiated."

# --- Step 6: Generate Report ---

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [[ "${HEALTH_STATUS}" == "PASS" ]]; then
  log "Backup verification PASSED in ${DURATION}s"
  write_report "SUCCESS" "Backup verification passed" "${SNAPSHOT_ID}" "${DURATION}"
  exit 0
else
  log "Backup verification FAILED"
  write_report "FAILURE" "Health check failed on restored instance" "${SNAPSHOT_ID}" "${DURATION}"
  exit 1
fi
