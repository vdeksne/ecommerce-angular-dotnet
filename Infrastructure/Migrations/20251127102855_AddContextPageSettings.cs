using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddContextPageSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "81f1838d-3d33-4031-a0e1-982ebecf3d78");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "f077bb3e-339f-4dc8-a732-a985a0378c00");

            migrationBuilder.CreateTable(
                name: "ContextPageSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SectionTitle = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SectionText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ObjectPositionX = table.Column<int>(type: "int", nullable: false, defaultValue: 50),
                    ObjectPositionY = table.Column<int>(type: "int", nullable: false, defaultValue: 50)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContextPageSettings", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { "bbbf6d91-7a8a-491e-bd01-52a40a50471e", null, "Admin", "ADMIN" },
                    { "f0afd736-bc9b-475d-9266-9e68baff2b65", null, "Customer", "CUSTOMER" }
                });

            migrationBuilder.InsertData(
                table: "ContextPageSettings",
                columns: new[] { "Id", "ImageUrl", "ObjectPositionX", "ObjectPositionY", "SectionText", "SectionTitle" },
                values: new object[] { 1, "", 50, 50, "At the age of 17, Mike Brodie hopped his first train close to home in Pensacola, Florida, thinking he would visit a friend in Mobile, Alabama. Instead, the train took him in the opposite direction to Jacksonville, Florida. Days later he rode the same train home, arriving back where he started.\n\nNonetheless, it sparked something in him and he began to wander across America by any means that were free - walking, hitchhiking, and train hopping. Shortly after his travels began he found a camera stuffed behind a car seat and began to take pictures. Brodie spent years crisscrossing the U.S., documenting his experiences, now appreciated as one of the most impressive archives of American travel photography.\n\nA Period of Juvenile Prosperity was named the best exhibition of the year by Vince Aletti in Artforum; and cited as one of the best photo books of 2013 by The Guardian, The New York Times, The Telegraph, and American Photo; it was short-listed for the Paris Photo/Aperture Foundation First PhotoBook Award.", "A Period of Juvenile Prosperity" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContextPageSettings");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "bbbf6d91-7a8a-491e-bd01-52a40a50471e");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "f0afd736-bc9b-475d-9266-9e68baff2b65");

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { "81f1838d-3d33-4031-a0e1-982ebecf3d78", null, "Customer", "CUSTOMER" },
                    { "f077bb3e-339f-4dc8-a732-a985a0378c00", null, "Admin", "ADMIN" }
                });
        }
    }
}
