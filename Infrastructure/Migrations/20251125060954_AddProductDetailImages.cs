using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProductDetailImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "37670970-a13e-4634-84a8-a05ee7060d55");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "73291708-5e2a-49b8-970d-efd813a12cf7");

            migrationBuilder.AddColumn<string>(
                name: "DetailImage1Url",
                table: "Products",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DetailImage2Url",
                table: "Products",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { "06d2e2ce-a329-4eb1-b28e-fc610c6550f3", null, "Customer", "CUSTOMER" },
                    { "95c871f3-9510-4372-bb26-91223d1a7811", null, "Admin", "ADMIN" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "06d2e2ce-a329-4eb1-b28e-fc610c6550f3");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "95c871f3-9510-4372-bb26-91223d1a7811");

            migrationBuilder.DropColumn(
                name: "DetailImage1Url",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "DetailImage2Url",
                table: "Products");

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { "37670970-a13e-4634-84a8-a05ee7060d55", null, "Customer", "CUSTOMER" },
                    { "73291708-5e2a-49b8-970d-efd813a12cf7", null, "Admin", "ADMIN" }
                });
        }
    }
}
