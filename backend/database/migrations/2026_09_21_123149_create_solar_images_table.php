<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solar_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solar_upload_batch_id')->constrained('solar_upload_batches')->cascadeOnDelete();
            $table->string('image_path');       // Relative path on disk, e.g. solar-images/sites/1/2026-09-21/img.jpg
            $table->string('image_url');        // Public URL served by nginx
            $table->string('original_name')->nullable();
            $table->unsignedBigInteger('file_size')->nullable(); // In bytes, after compression
            $table->boolean('is_flagged')->default(false);
            $table->text('flag_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solar_images');
    }
};
