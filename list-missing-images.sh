#!/bin/bash

# Script to list all missing images referenced in the database

export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

echo "=== Missing Images Recovery Report ==="
echo ""
echo "Checking database for image references..."
echo ""

# Get all product images
echo "=== PRODUCT IMAGES ==="
docker exec ecommerce-angular-dotnet-sql-1 /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U SA -P 'Password@1' -d skinet \
  -Q "SELECT DISTINCT PictureUrl FROM Products WHERE PictureUrl IS NOT NULL 
      UNION 
      SELECT DISTINCT DetailImage1Url FROM Products WHERE DetailImage1Url IS NOT NULL 
      UNION 
      SELECT DISTINCT DetailImage2Url FROM Products WHERE DetailImage2Url IS NOT NULL;" \
  -h -1 -W 2>&1 | grep -E "images/products" | sed 's|https://localhost:5001||' | while read img; do
    filename=$(basename "$img")
    if [ ! -f "API/wwwroot$img" ]; then
        echo "MISSING: $img"
    else
        echo "FOUND: $img"
    fi
done

echo ""
echo "=== ARCHIVE IMAGES ==="
docker exec ecommerce-angular-dotnet-sql-1 /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U SA -P 'Password@1' -d skinet \
  -Q "SELECT ImageUrl FROM ArchiveImages WHERE ImageUrl IS NOT NULL;" \
  -h -1 -W 2>&1 | grep -E "images/archive" | sed 's|https://localhost:5001||' | while read img; do
    filename=$(basename "$img")
    if [ ! -f "API/wwwroot$img" ]; then
        echo "MISSING: $img"
    else
        echo "FOUND: $img"
    fi
done

echo ""
echo "=== SUMMARY ==="
echo "All images need to be re-uploaded through the Admin panel:"
echo "1. Go to Admin → Catalog to re-upload product images"
echo "2. Go to Admin → Archive to re-upload archive images"
echo "3. Go to Admin → Homepage to upload homepage image"

