namespace Core.Entities;

public class ContextPageSettings : BaseEntity
{
    public string SectionTitle { get; set; } = string.Empty;
    public string SectionText { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public int ObjectPositionX { get; set; } = 50;
    public int ObjectPositionY { get; set; } = 50;
}

