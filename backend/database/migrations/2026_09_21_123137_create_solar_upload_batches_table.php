<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One batch = one WhatsApp-style submission: field report + multiple images
        Schema::create('solar_upload_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solar_section_id')->constrained('solar_sections')->cascadeOnDelete();
            $table->string('sub_section')->nullable();   // For Four Paul Yard sub-sections
            $table->enum('phase', ['before', 'after', 'general'])->default('general');
            $table->integer('table_number')->nullable(); // For table-wise sections
            // Field report (mirrors WhatsApp updates from supervisors)
            $table->date('work_date');
            $table->time('work_time')->nullable();
            $table->string('participants')->nullable();  // "Nadun, Sandun"
            $table->text('programme')->nullable();       // "Boundary mechanical fence setting out"
            $table->string('weather')->nullable();       // "Rainy", "Sunny", etc.
            $table->boolean('has_issue')->default(false);
            $table->text('issue_description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solar_upload_batches');
    }
};
