using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddHomePageSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "06d2e2ce-a329-4eb1-b28e-fc610c6550f3");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "95c871f3-9510-4372-bb26-91223d1a7811");

            migrationBuilder.CreateTable(
                name: "HomePageSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MainImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HomePageSettings", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { "68acae92-2c23-46fe-85a7-e360a94054e5", null, "Customer", "CUSTOMER" },
                    { "d1966335-6105-40e0-ac02-2fb705de40ab", null, "Admin", "ADMIN" }
                });

            migrationBuilder.InsertData(
                table: "HomePageSettings",
                columns: new[] { "Id", "MainImageUrl" },
                values: new object[] { 1, "http://localhost:3845/assets/cb9e66d935d49c7689ae8226cc698c188d0df981.png" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HomePageSettings");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "68acae92-2c23-46fe-85a7-e360a94054e5");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "d1966335-6105-40e0-ac02-2fb705de40ab");

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { "06d2e2ce-a329-4eb1-b28e-fc610c6550f3", null, "Customer", "CUSTOMER" },
                    { "95c871f3-9510-4372-bb26-91223d1a7811", null, "Admin", "ADMIN" }
                });
        }
    }
}
