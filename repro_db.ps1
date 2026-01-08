$env:PGPASSWORD='***REDACTED***'
$snapshotPath = Resolve-Path "reports/db_snapshots/milestone_3_delivery_confirmed.sql"
$migrationPath = Resolve-Path "backend/migrations/20260107_add_review_type_column.sql"

Write-Host "Restoring snapshot..."
psql -U postgres -d matrix_delivery_test -f $snapshotPath

Write-Host "Applying migration..."
psql -U postgres -d matrix_delivery_test -f $migrationPath

Write-Host "Resetting password..."
psql -U postgres -d matrix_delivery_test -c "UPDATE users SET password_hash = '`$2b`$10`$gppWr8dwbxXiNu9TIN7y5OHFILz0tV32XyxdxSlPdKaVwrIN5thZK' WHERE email = 'bob@test.com';"

Write-Host "Done."
