<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solar_daily_update_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solar_daily_update_id')->constrained('solar_daily_updates')->cascadeOnDelete();
            $table->string('image_path');
            $table->string('image_url');
            $table->string('original_name')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solar_daily_update_images');
    }
};
