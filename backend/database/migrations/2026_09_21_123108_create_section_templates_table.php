<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('section_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->integer('sort_order')->default(0);
            $table->boolean('has_before_after')->default(false);
            $table->boolean('has_table_tracking')->default(false); // e.g. Pile Marking, Panel Installation
            $table->json('sub_sections')->nullable();              // e.g. ["Civil Work", "Accessories", "Cable Work"]
            $table->integer('expected_images')->default(10);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('section_templates');
    }
};
