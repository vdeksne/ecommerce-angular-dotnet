using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config;

public class HomePageSettingsConfiguration : IEntityTypeConfiguration<HomePageSettings>
{
    public void Configure(EntityTypeBuilder<HomePageSettings> builder)
    {
        builder.Property(x => x.MainImageUrl).IsRequired();
        
        // Seed with empty value - frontend will use default fallback
        builder.HasData(
            new HomePageSettings 
            { 
                Id = 1, 
                MainImageUrl = "",
                ObjectPositionX = 50,
                ObjectPositionY = 50
            }
        );
    }
}

