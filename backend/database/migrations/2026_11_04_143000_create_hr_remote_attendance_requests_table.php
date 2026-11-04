<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('hr_remote_attendance_requests')) {
            Schema::create('hr_remote_attendance_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('hr_employees')->cascadeOnDelete();
                $table->foreignId('attendance_id')->nullable()->constrained('hr_attendances')->nullOnDelete();
                $table->date('date');
                $table->string('request_type', 20); // 'clock_in', 'clock_out'
                $table->timestamp('requested_time');

                // Geolocation Data
                $table->decimal('latitude', 10, 8);
                $table->decimal('longitude', 11, 8);
                $table->float('accuracy_meters')->nullable();
                $table->string('location_name', 255);
                $table->text('address')->nullable();

                // Reason & Evidence
                $table->string('reason_category', 100);
                $table->text('reason_notes');
                $table->string('evidence_photo_path', 255)->nullable();

                // Two-Tier Approval Status
                // pending, manager_approved, manager_rejected, approved, rejected
                $table->string('status', 30)->default('pending');

                // Stage 1: Approval Manager
                $table->foreignId('manager_approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('manager_approved_at')->nullable();
                $table->text('manager_notes')->nullable();

                // Stage 2: HR Admin
                $table->foreignId('hr_approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('hr_approved_at')->nullable();
                $table->text('hr_notes')->nullable();

                $table->timestamps();
                $table->softDeletes();

                $table->index(['employee_id', 'date']);
                $table->index('status');
                $table->index('request_type');
            });
        }

        if (Schema::hasTable('hr_attendances')) {
            Schema::table('hr_attendances', function (Blueprint $table) {
                if (!Schema::hasColumn('hr_attendances', 'is_remote')) {
                    $table->boolean('is_remote')->default(false)->after('is_manual_override');
                }
                if (!Schema::hasColumn('hr_attendances', 'is_remote_clock_in')) {
                    $table->boolean('is_remote_clock_in')->default(false)->after('is_remote');
                }
                if (!Schema::hasColumn('hr_attendances', 'is_remote_clock_out')) {
                    $table->boolean('is_remote_clock_out')->default(false)->after('is_remote_clock_in');
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_remote_attendance_requests');

        if (Schema::hasTable('hr_attendances')) {
            Schema::table('hr_attendances', function (Blueprint $table) {
                if (Schema::hasColumn('hr_attendances', 'is_remote_clock_out')) {
                    $table->dropColumn('is_remote_clock_out');
                }
                if (Schema::hasColumn('hr_attendances', 'is_remote_clock_in')) {
                    $table->dropColumn('is_remote_clock_in');
                }
                if (Schema::hasColumn('hr_attendances', 'is_remote')) {
                    $table->dropColumn('is_remote');
                }
            });
        }
    }
};

