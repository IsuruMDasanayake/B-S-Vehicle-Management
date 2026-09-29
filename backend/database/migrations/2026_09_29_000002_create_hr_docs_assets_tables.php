<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hr_employee_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hr_employee_id')->constrained('hr_employees')->cascadeOnDelete();
            $table->string('title');
            $table->string('file_path');
            $table->date('upload_date');
            $table->timestamps();
        });

        Schema::create('hr_employee_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hr_employee_id')->constrained('hr_employees')->cascadeOnDelete();
            $table->string('name');
            $table->string('asset_id')->nullable();
            $table->date('assigned_date');
            $table->enum('status', ['assigned', 'returned', 'damaged'])->default('assigned');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_employee_assets');
        Schema::dropIfExists('hr_employee_documents');
    }
};
