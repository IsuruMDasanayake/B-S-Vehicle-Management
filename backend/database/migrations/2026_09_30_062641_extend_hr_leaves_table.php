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
        Schema::table('hr_leaves', function (Blueprint $table) {
            $table->decimal('days_count', 5, 2)->change(); // Allow half days
            $table->integer('hours_count')->nullable()->after('days_count'); // For short leave
            $table->string('attachment')->nullable()->after('reason');
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
        Schema::table('hr_leaves', function (Blueprint $table) {
            $table->integer('days_count')->change();
            $table->dropColumn(['hours_count', 'attachment', 'manager_approved_by', 'manager_approved_at', 'manager_notes']);
        });
    }
};
