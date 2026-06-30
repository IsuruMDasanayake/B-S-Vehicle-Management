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
        Schema::table('accidents', function (Blueprint $table) {
            $table->string('driver_name')->nullable()->after('driver_id');
            $table->enum('assignee_type', ['internal', 'external', 'manual'])->default('internal')->after('vehicle_id');
            $table->foreignId('vehicle_request_id')->nullable()->after('driver_name')->constrained('vehicle_requests')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('accidents', function (Blueprint $table) {
            $table->dropForeign(['vehicle_request_id']);
            $table->dropColumn(['driver_name', 'assignee_type', 'vehicle_request_id']);
        });
    }
};
