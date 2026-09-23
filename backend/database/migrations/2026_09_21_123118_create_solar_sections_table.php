<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solar_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solar_project_id')->constrained('solar_projects')->cascadeOnDelete();
            $table->string('name');
            $table->integer('sort_order')->default(0);
            $table->boolean('has_before_after')->default(false);
            $table->boolean('has_table_tracking')->default(false);
            $table->json('sub_sections')->nullable();
            $table->integer('expected_images')->default(10);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solar_sections');
    }
};
