# Image Recovery Guide

## Current Situation

The database contains references to images (product images and archive images), but the actual image files are missing from `API/wwwroot/images/`. The image files are stored on the file system, not in the database.

## Missing Images

**All images are missing from the file system.** The database has 23 product images and 9 archive images that need to be restored.

### Product Images (23 files)
Run `./list-missing-images.sh` to see the complete list. All product images in the database are missing from `API/wwwroot/images/products/`.

### Archive Images (9 files)
All archive images in the database are missing from `API/wwwroot/images/archive/`.

**Note:** Images are stored as physical files on disk, not in the database. The database only stores the file paths.

## Recovery Options

### Option 1: Restore from Backup (If Available)

If you have a backup of the `wwwroot/images` folder:

```bash
# Copy images from backup to current location
cp -r /path/to/backup/wwwroot/images/* API/wwwroot/images/
```

### Option 2: Re-upload Images via Admin Panel

1. **For Products:**
   - Go to Admin → Catalog
   - Edit each product
   - Re-upload the product images (main image, detail images)
   - Save the product

2. **For Archive Images:**
   - Go to Admin → Archive
   - Edit each archive image
   - Re-upload the image file
   - Save the archive image

3. **For Homepage Image:**
   - Go to Admin → Homepage
   - Upload the homepage main image
   - Save

### Option 3: Extract from Old Project Directory

If you have an old version of the project with images:

```bash
# Find old project directory
# Copy images from old location
cp -r /path/to/old/project/API/wwwroot/images/* API/wwwroot/images/
```

### Option 4: Use Placeholder Images

Temporarily use placeholder images until you can re-upload the real ones.

## Directory Structure

Images should be organized as:
```
API/wwwroot/
  images/
    products/
      [product-image-files]
    archive/
      [archive-image-files]
    homepage/
      [homepage-image-files]
```

## Verification

After restoring images, verify they're accessible:
```bash
# Check if images exist
ls -la API/wwwroot/images/products/
ls -la API/wwwroot/images/archive/

# Test via API (should return 200, not 404)
curl -I https://localhost:5001/images/products/[filename]
```

## Quick Recovery Commands

### Check Missing Images
```bash
./list-missing-images.sh
```

### Create Directory Structure (Already Done)
```bash
mkdir -p API/wwwroot/images/{products,archive,homepage}
```

## Next Steps

1. **Check for backups:**
   - Look for Time Machine backups
   - Check if you have the images saved elsewhere
   - Check if there's an old project directory with images

2. **If no backup exists:**
   - Re-upload all images through the Admin panel
   - Products: Admin → Catalog → Edit each product → Upload images
   - Archive: Admin → Archive → Edit each image → Upload image
   - Homepage: Admin → Homepage → Upload image

3. **The directory structure is ready:**
   - `API/wwwroot/images/products/` - for product images
   - `API/wwwroot/images/archive/` - for archive images  
   - `API/wwwroot/images/homepage/` - for homepage image

## Important Note

Since images are physical files (not in database or Docker volumes), they can only be recovered from:
- File system backups
- Old project directories
- Manual re-upload through the admin interface

The database recovery only restored the data (product info, image paths), but not the actual image files themselves.

