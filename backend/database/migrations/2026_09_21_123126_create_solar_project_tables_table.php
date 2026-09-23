<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solar_project_tables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solar_project_id')->constrained('solar_projects')->cascadeOnDelete();
            $table->integer('table_number');
            $table->integer('panel_count')->default(28); // 28 or 14 (half table)
            $table->timestamps();

            $table->unique(['solar_project_id', 'table_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solar_project_tables');
    }
};
