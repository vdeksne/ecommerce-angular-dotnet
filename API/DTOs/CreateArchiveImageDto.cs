namespace API.DTOs;

public class CreateArchiveImageDto
{
    public required string ImageUrl { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsMainImage { get; set; }
    public double ObjectPositionX { get; set; } = 50;
    public double ObjectPositionY { get; set; } = 50;
}

