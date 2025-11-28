using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config;

public class ContextPageSettingsConfiguration : IEntityTypeConfiguration<ContextPageSettings>
{
    public void Configure(EntityTypeBuilder<ContextPageSettings> builder)
    {
        builder.Property(x => x.SectionTitle).IsRequired();
        builder.Property(x => x.SectionText).IsRequired();
        builder.Property(x => x.ImageUrl).IsRequired();
        builder.Property(x => x.ObjectPositionX).HasDefaultValue(50);
        builder.Property(x => x.ObjectPositionY).HasDefaultValue(50);

        // Seed with default values
        builder.HasData(
            new ContextPageSettings
            {
                Id = 1,
                SectionTitle = "A Period of Juvenile Prosperity",
                SectionText = "At the age of 17, Mike Brodie hopped his first train close to home in Pensacola, Florida, thinking he would visit a friend in Mobile, Alabama. Instead, the train took him in the opposite direction to Jacksonville, Florida. Days later he rode the same train home, arriving back where he started.\n\nNonetheless, it sparked something in him and he began to wander across America by any means that were free - walking, hitchhiking, and train hopping. Shortly after his travels began he found a camera stuffed behind a car seat and began to take pictures. Brodie spent years crisscrossing the U.S., documenting his experiences, now appreciated as one of the most impressive archives of American travel photography.\n\nA Period of Juvenile Prosperity was named the best exhibition of the year by Vince Aletti in Artforum; and cited as one of the best photo books of 2013 by The Guardian, The New York Times, The Telegraph, and American Photo; it was short-listed for the Paris Photo/Aperture Foundation First PhotoBook Award.",
                ImageUrl = "",
                ObjectPositionX = 50,
                ObjectPositionY = 50
            }
        );
    }
}

