using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddImagePositionToArchive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "14c23f59-6110-46f0-b413-c69e6f610fdb");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "48cadd01-e4ac-49a5-87d5-e5cf48adbdc6");

            migrationBuilder.AddColumn<double>(
                name: "ObjectPositionX",
                table: "ArchiveImages",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "ObjectPositionY",
                table: "ArchiveImages",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { "37670970-a13e-4634-84a8-a05ee7060d55", null, "Customer", "CUSTOMER" },
                    { "73291708-5e2a-49b8-970d-efd813a12cf7", null, "Admin", "ADMIN" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "37670970-a13e-4634-84a8-a05ee7060d55");

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: "73291708-5e2a-49b8-970d-efd813a12cf7");

            migrationBuilder.DropColumn(
                name: "ObjectPositionX",
                table: "ArchiveImages");

            migrationBuilder.DropColumn(
                name: "ObjectPositionY",
                table: "ArchiveImages");

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { "14c23f59-6110-46f0-b413-c69e6f610fdb", null, "Admin", "ADMIN" },
                    { "48cadd01-e4ac-49a5-87d5-e5cf48adbdc6", null, "Customer", "CUSTOMER" }
                });
        }
    }
}
