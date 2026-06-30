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
        Schema::table('vehicle_assignments', function (Blueprint $table) {
            // Make driver_id nullable to support external requesters where no driver is assigned
            $table->unsignedBigInteger('driver_id')->nullable()->change();
            
            // Link to the external vehicle request
            $table->foreignId('vehicle_request_id')->nullable()->after('driver_id')->constrained('vehicle_requests')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicle_assignments', function (Blueprint $table) {
            $table->dropForeign(['vehicle_request_id']);
            $table->dropColumn('vehicle_request_id');
            // We cannot easily change driver_id back to non-nullable if data exists, so we leave it nullable or force it.
            // $table->unsignedBigInteger('driver_id')->nullable(false)->change();
        });
    }
};
