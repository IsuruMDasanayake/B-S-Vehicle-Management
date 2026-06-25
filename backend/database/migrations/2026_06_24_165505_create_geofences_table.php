<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('geofences', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['polygon', 'circle'])->default('polygon');
            $table->json('coordinates'); // Array of lat/lng for polygon, or center point for circle
            $table->float('radius')->nullable(); // For circle
            $table->enum('alert_type', ['entry', 'exit', 'both'])->default('both');
            $table->string('color')->default('#3388ff');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('geofences');
    }
};
