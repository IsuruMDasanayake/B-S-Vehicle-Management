<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hr_training_lessons', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('category')->default('General');
            $table->string('video_path');
            $table->string('video_filename')->nullable();
            $table->unsignedBigInteger('file_size_bytes')->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->unsignedTinyInteger('min_watch_percentage')->default(90);
            $table->boolean('is_mandatory')->default(true);
            $table->date('due_date')->nullable();
            $table->string('target_type')->default('all'); // all, department, designation, custom
            $table->string('status')->default('published'); // draft, published, archived
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('hr_training_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->constrained('hr_training_lessons')->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('hr_departments')->cascadeOnDelete();
            $table->foreignId('designation_id')->nullable()->constrained('hr_designations')->cascadeOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained('hr_employees')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('hr_training_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->constrained('hr_training_lessons')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('hr_employees')->cascadeOnDelete();
            $table->unsignedInteger('seconds_watched')->default(0);
            $table->unsignedInteger('max_position_seconds')->default(0);
            $table->unsignedInteger('last_position_seconds')->default(0);
            $table->decimal('watch_percentage', 5, 2)->default(0.00);
            $table->string('status')->default('not_started'); // not_started, in_progress, completed
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->text('employee_reply')->nullable();
            $table->text('employee_notes')->nullable();
            $table->timestamps();

            $table->unique(['lesson_id', 'employee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_training_progress');
        Schema::dropIfExists('hr_training_targets');
        Schema::dropIfExists('hr_training_lessons');
    }
};

