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
        Schema::table('hr_attendance_regularizations', function (Blueprint $table) {
            $table->foreignId('manager_approved_by')->nullable()->after('status')->constrained('users')->nullOnDelete();
            $table->timestamp('manager_approved_at')->nullable()->after('manager_approved_by');
            $table->text('manager_notes')->nullable()->after('manager_approved_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hr_attendance_regularizations', function (Blueprint $table) {
            $table->dropForeign(['manager_approved_by']);
            $table->dropColumn(['manager_approved_by', 'manager_approved_at', 'manager_notes']);
        });
    }
};

