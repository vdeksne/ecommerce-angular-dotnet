namespace API.DTOs;

public class UpdateArchiveImageDto
{
    public string? ImageUrl { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public int? DisplayOrder { get; set; }
    public bool? IsMainImage { get; set; }
    public double? ObjectPositionX { get; set; }
    public double? ObjectPositionY { get; set; }
}

