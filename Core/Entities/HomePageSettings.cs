namespace Core.Entities;

public class HomePageSettings : BaseEntity
{
    public string MainImageUrl { get; set; } = string.Empty;
    public int ObjectPositionX { get; set; } = 50;
    public int ObjectPositionY { get; set; } = 50;
}

