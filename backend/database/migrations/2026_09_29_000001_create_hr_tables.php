<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── HR Departments ────────────────────────────────────────────────────
        Schema::create('hr_departments', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('description')->nullable();
            $table->timestamps();
        });

        // ── HR Designations ───────────────────────────────────────────────────
        Schema::create('hr_designations', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->foreignId('department_id')->constrained('hr_departments')->cascadeOnDelete();
            $table->enum('level', ['Junior', 'Mid', 'Senior', 'Lead', 'C_Level'])->default('Mid');
            $table->timestamps();
        });

        // ── HR Employees ──────────────────────────────────────────────────────
        Schema::create('hr_employees', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id')->unique();           // CE-001
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('hr_departments')->nullOnDelete();
            $table->foreignId('designation_id')->nullable()->constrained('hr_designations')->nullOnDelete();
            $table->foreignId('manager_id')->nullable()->constrained('hr_employees')->nullOnDelete();

            // Personal
            $table->string('full_name');
            $table->string('photo')->nullable();
            $table->string('nic')->nullable();
            $table->date('dob')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->string('phone')->nullable();
            $table->string('personal_email')->nullable();
            $table->string('company_email')->nullable();
            $table->text('address')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone')->nullable();

            // Employment
            $table->enum('employment_type', ['full_time', 'part_time', 'contract', 'intern'])->default('full_time');
            $table->date('joined_date');
            $table->date('probation_end_date')->nullable();
            $table->string('work_location')->default('Office');   // Office | Site | Remote | Hybrid
            $table->enum('status', ['active', 'probation', 'on_leave', 'resigned', 'terminated'])->default('active');
            $table->decimal('basic_salary', 12, 2)->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_employees');
        Schema::dropIfExists('hr_designations');
        Schema::dropIfExists('hr_departments');
    }
};
