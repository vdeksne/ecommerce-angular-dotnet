using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddHomePageImagePosition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "68acae92-2c23-46fe-85a7-e360a94054e5");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "d1966335-6105-40e0-ac02-2fb705de40ab");

            migrationBuilder.AddColumn<int>(
                name: "ObjectPositionX",
                table: "HomePageSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ObjectPositionY",
                table: "HomePageSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { "81f1838d-3d33-4031-a0e1-982ebecf3d78", null, "Customer", "CUSTOMER" },
                    { "f077bb3e-339f-4dc8-a732-a985a0378c00", null, "Admin", "ADMIN" }
                });

            migrationBuilder.UpdateData(
                table: "HomePageSettings",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "MainImageUrl", "ObjectPositionX", "ObjectPositionY" },
                values: new object[] { "", 50, 50 });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "81f1838d-3d33-4031-a0e1-982ebecf3d78");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "f077bb3e-339f-4dc8-a732-a985a0378c00");

            migrationBuilder.DropColumn(
                name: "ObjectPositionX",
                table: "HomePageSettings");

            migrationBuilder.DropColumn(
                name: "ObjectPositionY",
                table: "HomePageSettings");

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { "68acae92-2c23-46fe-85a7-e360a94054e5", null, "Customer", "CUSTOMER" },
                    { "d1966335-6105-40e0-ac02-2fb705de40ab", null, "Admin", "ADMIN" }
                });

            migrationBuilder.UpdateData(
                table: "HomePageSettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "MainImageUrl",
                value: "http://localhost:3845/assets/cb9e66d935d49c7689ae8226cc698c188d0df981.png");
        }
    }
}
