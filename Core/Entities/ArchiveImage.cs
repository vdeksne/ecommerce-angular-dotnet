namespace Core.Entities;

public class ArchiveImage : BaseEntity
{
    public required string ImageUrl { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsMainImage { get; set; }
    public double ObjectPositionX { get; set; } = 50; // Percentage for CSS object-position (default: 50% center)
    public double ObjectPositionY { get; set; } = 50; // Percentage for CSS object-position (default: 50% center)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

