<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add is_auto_clock_out flag to hr_attendances
        Schema::table('hr_attendances', function (Blueprint $table) {
            $table->boolean('is_auto_clock_out')->default(false)->after('is_manual_override');
        });

        // 2. Create hr_attendance_regularizations table
        Schema::create('hr_attendance_regularizations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_id')->constrained('hr_attendances')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('hr_employees')->cascadeOnDelete();
            $table->timestamp('requested_clock_out_time');
            $table->text('reason');
            $table->string('status')->default('pending'); // pending, approved, rejected
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('admin_notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['employee_id', 'status']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_attendance_regularizations');

        Schema::table('hr_attendances', function (Blueprint $table) {
            $table->dropColumn('is_auto_clock_out');
        });
    }
};
