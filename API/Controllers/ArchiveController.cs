using API.DTOs;
using Core.Entities;
using Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

public class ArchiveController(IUnitOfWork unit) : BaseApiController
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ArchiveImage>>> GetArchiveImages()
    {
        var images = await unit.Repository<ArchiveImage>().ListAllAsync();
        return Ok(images.OrderBy(x => x.DisplayOrder).ThenBy(x => x.Id));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ArchiveImage>> GetArchiveImage(int id)
    {
        var image = await unit.Repository<ArchiveImage>().GetByIdAsync(id);
        if (image == null) return NotFound();
        return Ok(image);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<ArchiveImage>> CreateArchiveImage(CreateArchiveImageDto dto)
    {
        var image = new ArchiveImage
        {
            ImageUrl = dto.ImageUrl,
            Title = dto.Title,
            Description = dto.Description,
            DisplayOrder = dto.DisplayOrder,
            IsMainImage = dto.IsMainImage,
            ObjectPositionX = dto.ObjectPositionX,
            ObjectPositionY = dto.ObjectPositionY
        };

        // If this is set as main image, unset others
        if (dto.IsMainImage)
        {
            var existingMain = (await unit.Repository<ArchiveImage>().ListAllAsync())
                .FirstOrDefault(x => x.IsMainImage);
            if (existingMain != null)
            {
                existingMain.IsMainImage = false;
                unit.Repository<ArchiveImage>().Update(existingMain);
            }
        }

        unit.Repository<ArchiveImage>().Add(image);
        await unit.Complete();
        return Ok(image);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<ActionResult<ArchiveImage>> UpdateArchiveImage(int id, UpdateArchiveImageDto dto)
    {
        var image = await unit.Repository<ArchiveImage>().GetByIdAsync(id);
        if (image == null) return NotFound();

        image.ImageUrl = dto.ImageUrl ?? image.ImageUrl;
        image.Title = dto.Title ?? image.Title;
        image.Description = dto.Description ?? image.Description;
        image.DisplayOrder = dto.DisplayOrder ?? image.DisplayOrder;
        
        // Always update position values if provided in DTO (including 0)
        // This ensures the position is saved even if it's 0
        if (dto.ObjectPositionX.HasValue)
        {
            image.ObjectPositionX = dto.ObjectPositionX.Value;
        }
        
        if (dto.ObjectPositionY.HasValue)
        {
            image.ObjectPositionY = dto.ObjectPositionY.Value;
        }
        
        // Debug: Log the values being saved
        Console.WriteLine($"Saving position: X={image.ObjectPositionX}, Y={image.ObjectPositionY}");

        // Handle main image change
        if (dto.IsMainImage.HasValue && dto.IsMainImage.Value != image.IsMainImage)
        {
            if (dto.IsMainImage.Value)
            {
                var existingMain = (await unit.Repository<ArchiveImage>().ListAllAsync())
                    .FirstOrDefault(x => x.IsMainImage && x.Id != id);
                if (existingMain != null)
                {
                    existingMain.IsMainImage = false;
                    unit.Repository<ArchiveImage>().Update(existingMain);
                }
            }
            image.IsMainImage = dto.IsMainImage.Value;
        }

        // The entity is already tracked from GetByIdAsync, so EF should detect changes automatically
        // But to be safe, we'll explicitly mark it as modified
        // Note: Update() attaches the entity, which is fine even if already tracked
        unit.Repository<ArchiveImage>().Update(image);
        
        // Save changes
        var saved = await unit.Complete();
        if (!saved)
        {
            Console.WriteLine("WARNING: SaveChangesAsync returned false - no changes were saved!");
            // Even if saved returns false, try to reload to see what's in DB
        }
        
        // Verify the values were actually saved by checking the database directly
        Console.WriteLine($"After save, image.ObjectPositionX={image.ObjectPositionX}, image.ObjectPositionY={image.ObjectPositionY}");
        
        // Reload the image to ensure we return the latest data from database
        var updatedImage = await unit.Repository<ArchiveImage>().GetByIdAsync(id);
        
        // Debug: Log the values being returned
        if (updatedImage != null)
        {
            Console.WriteLine($"Returning position: X={updatedImage.ObjectPositionX}, Y={updatedImage.ObjectPositionY}");
            // Double-check: if values are still default, log a warning
            if (updatedImage.ObjectPositionX == 50 && updatedImage.ObjectPositionY == 50 && 
                (dto.ObjectPositionX.HasValue && dto.ObjectPositionX.Value != 50 || 
                 dto.ObjectPositionY.HasValue && dto.ObjectPositionY.Value != 50))
            {
                Console.WriteLine($"WARNING: Position values may not have been saved! Expected X={dto.ObjectPositionX}, Y={dto.ObjectPositionY}");
            }
        }
        
        return Ok(updatedImage);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteArchiveImage(int id)
    {
        var image = await unit.Repository<ArchiveImage>().GetByIdAsync(id);
        if (image == null) return NotFound();

        unit.Repository<ArchiveImage>().Remove(image);
        await unit.Complete();
        return NoContent();
    }
}

