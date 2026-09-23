<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solar_projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solar_site_id')->constrained('solar_sites')->cascadeOnDelete();
            $table->string('name');
            $table->string('client_name')->nullable();
            $table->enum('status', ['active', 'completed', 'on_hold'])->default('active');
            $table->date('start_date')->nullable();
            $table->date('expected_completion')->nullable();
            $table->json('assigned_supervisors')->nullable(); // [{"name": "Nadun", "phone": "077..."}]
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solar_projects');
    }
};
